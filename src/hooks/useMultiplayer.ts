import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Move, Piece, Position, PieceColor } from '@/types/chess';
import { GameSession } from '@/types/multiplayer';
import { createInitialGameState, applyGravity, cloneBoard, findKing, isSquareUnderAttack, getValidMoves } from '@/utils/chess';
import { getPlayerId } from '@/utils/player';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useSearchParams } from 'react-router-dom';

export function useMultiplayer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('game');

  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'spectator'>('spectator');
  const [playerPresence, setPlayerPresence] = useState<{ white: boolean; black: boolean }>({ white: false, black: false });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerId = getPlayerId();

  const gameState = gameSession?.game_state as GameState | null;

  useEffect(() => {
    if (gameSession && playerId) {
      if (gameSession.white_player_id === playerId) {
        setPlayerColor('white');
      } else if (gameSession.black_player_id === playerId) {
        setPlayerColor('black');
      } else {
        setPlayerColor('spectator');
      }
    }
  }, [gameSession, playerId]);

  useEffect(() => {
    if (!sessionId) {
      setGameSession(null);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const refetchGameSession = async () => {
      const { data } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
      if (data) setGameSession(data);
    };

    const setupChannel = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
      setIsLoading(false);

      if (error || !data) {
        toast({ title: "Error", description: "Game not found.", variant: "destructive" });
        setSearchParams({});
        return;
      }
      setGameSession(data);

      const channel = supabase.channel(`game:${sessionId}`);
      channelRef.current = channel;

      channel
        .on<GameSession>('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
          setGameSession(payload.new as GameSession);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const newPresence = { white: false, black: false };
          for (const key in presenceState) {
            const presences = presenceState[key] as unknown as { color: 'white' | 'black' }[];
            if (presences[0]?.color === 'white') newPresence.white = true;
            if (presences[0]?.color === 'black') newPresence.black = true;
          }
          setPlayerPresence(newPresence);
        })
        .on('broadcast', { event: 'player_joined' }, () => {
          toast({ title: "Opponent Joined!", description: "Your game is ready to start." });
          refetchGameSession();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ player_id: playerId, color: playerColor });
          }
        });
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, playerId, playerColor, setSearchParams]);

  const createGame = useCallback(async () => {
    setIsLoading(true);
    const initialGameState = createInitialGameState();
    const { data, error } = await supabase.from('game_sessions').insert({
      white_player_id: playerId,
      game_state: initialGameState as any,
      current_player: 'white',
      status: 'waiting'
    }).select().single();

    setIsLoading(false);
    if (error || !data) {
      toast({ title: "Error", description: "Could not create game.", variant: "destructive" });
      return;
    }
    setSearchParams({ game: data.id });
  }, [playerId, setSearchParams]);

  const joinGame = useCallback(async (id: string) => {
    setIsLoading(true);
    const { data: existing, error: fetchError } = await supabase.from('game_sessions').select('*').eq('id', id).single();

    if (fetchError || !existing) {
      toast({ title: "Error", description: "Game not found.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (existing.white_player_id === playerId || existing.black_player_id === playerId) {
      setSearchParams({ game: id });
      setIsLoading(false);
      return;
    }

    if (existing.black_player_id) {
      toast({ title: "Game Full", description: "This game is already full.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('game_sessions')
      .update({ black_player_id: playerId, status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedSession) {
      toast({ title: "Error", description: "Could not join game.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const channel = supabase.channel(`game:${id}`);
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event: 'player_joined', payload: {} });
        supabase.removeChannel(channel);
      }
    });

    setSearchParams({ game: id });
    setIsLoading(false);
  }, [playerId, setSearchParams]);

  const leaveGame = () => {
    setSearchParams({});
  };

  const makeMove = async (from: Position, to: Position) => {
    if (!gameSession || !gameState || playerColor === 'spectator' || gameState.currentPlayer !== playerColor) return;

    const piece = gameState.board[from.row][from.col];
    if (!piece) return;

    const newBoard = cloneBoard(gameState.board);
    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;
    const boardWithGravity = applyGravity(newBoard);

    const move: Move = { from, to, piece };
    const newGameState: GameState = {
      ...gameState,
      board: boardWithGravity,
      currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
      moveHistory: [...gameState.moveHistory, move],
      currentMoveIndex: gameState.moveHistory.length,
    };

    const { error } = await supabase.from('game_sessions').update({
      game_state: newGameState as any,
      current_player: newGameState.currentPlayer
    }).eq('id', gameSession.id);

    if (error) {
      toast({ title: "Error", description: "Failed to make move.", variant: "destructive" });
    } else {
      setSelectedSquare(null);
    }
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!gameState || playerColor === 'spectator' || gameState.currentPlayer !== playerColor) return;

    const clickedPos = { row, col };
    const piece = gameState.board[row][col];

    if (selectedSquare) {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        return;
      }
      makeMove(selectedSquare, clickedPos);
    } else if (piece && piece.color === playerColor) {
      setSelectedSquare(clickedPos);
    }
  };

  const possibleMoves = useMemo(() => {
    if (!gameState || !selectedSquare) return [];
    const piece = gameState.board[selectedSquare.row][selectedSquare.col];
    if (!piece) return [];
    return getValidMoves(gameState.board, selectedSquare, piece, gameState.enPassantTarget, gameState.castlingRights).map(m => m.to);
  }, [gameState, selectedSquare]);

  const kingInCheck = useMemo(() => {
    if (!gameState || !playerColor || playerColor === 'spectator') return null;
    const kingPos = findKing(gameState.board, playerColor);
    if (!kingPos) return null;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(gameState.board, kingPos, opponentColor) ? kingPos : null;
  }, [gameState, playerColor]);

  const lastMove = useMemo(() => {
    if (!gameState || !gameState.moveHistory || gameState.moveHistory.length === 0) return undefined;
    return gameState.moveHistory[gameState.moveHistory.length - 1];
  }, [gameState]);

  return {
    gameSession,
    gameState,
    playerColor,
    playerPresence,
    isLoading,
    createGame,
    joinGame,
    leaveGame,
    handleSquareClick,
    selectedSquare,
    possibleMoves,
    dangerousMoves: [],
    kingInCheck,
    lastMove,
  };
}