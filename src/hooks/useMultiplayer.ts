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

  const refetchGameSession = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('game_sessions').select('*').eq('id', id).single();
    if (data) {
      setGameSession(data);
    } else if (error) {
      toast({ title: "Error refreshing game", description: error.message, variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setGameSession(null);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    let channel: RealtimeChannel;

    const setup = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
      setIsLoading(false);

      if (error || !data) {
        toast({ title: "Error", description: "Game not found.", variant: "destructive" });
        setSearchParams({});
        return;
      }

      setGameSession(data);

      let color: PieceColor | 'spectator' = 'spectator';
      if (data.white_player_id === playerId) color = 'white';
      else if (data.black_player_id === playerId) color = 'black';
      setPlayerColor(color);

      channel = supabase.channel(`game:${sessionId}`);
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
          refetchGameSession(sessionId);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ player_id: playerId, color });
          }
        });
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, playerId, setSearchParams, refetchGameSession]);

  const createGame = useCallback(async (): Promise<string | null> => {
    const initialGameState = createInitialGameState();
    const { data, error } = await supabase.from('game_sessions').insert({
      white_player_id: playerId,
      game_state: initialGameState as any,
      current_player: 'white',
      status: 'waiting'
    }).select().single();

    if (error || !data) {
      toast({ title: "Error", description: "Could not create game.", variant: "destructive" });
      return null;
    }
    return data.id;
  }, [playerId]);

  const joinGame = useCallback(async (id: string): Promise<boolean> => {
    const { data: existing, error: fetchError } = await supabase.from('game_sessions').select('*').eq('id', id).single();
    if (fetchError || !existing) {
      toast({ title: "Error", description: "Game not found.", variant: "destructive" });
      return false;
    }
    if (existing.black_player_id && existing.black_player_id !== playerId && existing.white_player_id !== playerId) {
      toast({ title: "Game Full", description: "This game is already full.", variant: "destructive" });
      return false;
    }
    if (!existing.black_player_id && existing.white_player_id !== playerId) {
      const { error } = await supabase.from('game_sessions').update({ black_player_id: playerId, status: 'active' }).eq('id', id);
      if (error) {
        toast({ title: "Error", description: "Could not join game.", variant: "destructive" });
        return false;
      }
      // Broadcast that a player has joined
      const channel = supabase.channel(`game:${id}`);
      await channel.subscribe();
      await channel.send({ type: 'broadcast', event: 'player_joined', payload: {} });
      supabase.removeChannel(channel);
    }
    return true;
  }, [playerId]);

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