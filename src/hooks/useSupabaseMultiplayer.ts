import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Move } from '@/types/chess';
import { GameSession, PlayerInfo } from '@/types/multiplayer';
import { createInitialGameState, applyGravity, cloneBoard } from '@/utils/chess';
import { getPlayerId } from '@/utils/player';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useSupabaseMultiplayer(sessionId: string | null) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerPresence, setPlayerPresence] = useState<{ white: boolean; black: boolean }>({ white: false, black: false });
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerId = getPlayerId();

  const playerInfo: PlayerInfo | null = useMemo(() => {
    if (!gameSession || !playerId) return null;
    if (gameSession.white_player_id === playerId) {
      return { id: playerId, color: 'white' };
    }
    if (gameSession.black_player_id === playerId) {
      return { id: playerId, color: 'black' };
    }
    return { id: playerId, color: 'spectator' };
  }, [gameSession, playerId]);

  const refetchGameSession = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('game_sessions').select('*').eq('id', id).single();
    if (data) {
      setGameSession(data as GameSession);
    }
  }, []);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (sessionId) {
      setIsLoading(true);
      const channel = supabase.channel(`game:${sessionId}`);
      channelRef.current = channel;

      channel
        .on<GameSession>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
          setGameSession(payload.new);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const newPresence = { white: false, black: false };
          for (const id in presenceState) {
            const presences = presenceState[id] as unknown as { color: 'white' | 'black' | 'spectator' }[];
            const userColor = presences[0]?.color;
            if (userColor === 'white') newPresence.white = true;
            if (userColor === 'black') newPresence.black = true;
          }
          setPlayerPresence(newPresence);
        })
        .on('broadcast', { event: 'force_refetch' }, () => {
          refetchGameSession(sessionId);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await refetchGameSession(sessionId);
            setIsLoading(false);
            if (playerInfo) {
              await channel.track({ player_id: playerId, color: playerInfo.color });
            }
          }
        });
    } else {
      setIsLoading(false);
      setGameSession(null);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, playerId, playerInfo, refetchGameSession]);

  const createGame = useCallback(async (): Promise<string | null> => {
    const initialGameState = createInitialGameState();
    const { data, error } = await supabase.from('game_sessions').insert({ white_player_id: playerId, game_state: initialGameState as any, current_player: 'white', status: 'waiting' }).select().single();
    if (error) {
      toast({ title: "Error", description: "Could not create game.", variant: "destructive" });
      return null;
    }
    return data.id;
  }, [playerId]);

  const joinGame = useCallback(async (joinSessionId: string): Promise<boolean> => {
    const { data: existingSession, error: fetchError } = await supabase.from('game_sessions').select('*').eq('id', joinSessionId).single();
    if (fetchError || !existingSession) {
      toast({ title: "Error", description: "Game not found.", variant: "destructive" });
      return false;
    }

    if (existingSession.white_player_id === playerId || existingSession.black_player_id === playerId) {
      setGameSession(existingSession as GameSession);
      return true;
    }

    if (existingSession.black_player_id) {
      toast({ title: "Game Full", description: "This game is already full.", variant: "destructive" });
      return false;
    }

    const { data: updatedSession, error: updateError } = await supabase.from('game_sessions').update({ black_player_id: playerId, status: 'active' }).eq('id', joinSessionId).select().single();
    if (updateError || !updatedSession) {
      toast({ title: "Error", description: "Could not join game.", variant: "destructive" });
      return false;
    }

    setGameSession(updatedSession as GameSession);

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'force_refetch', payload: {} });
    }
    return true;
  }, [playerId]);

  const makeMove = useCallback(async (move: Move) => {
    if (!gameSession || !playerInfo || playerInfo.color === 'spectator' || gameSession.current_player !== playerInfo.color) return;
    const currentBoard = cloneBoard(gameSession.game_state.board);
    currentBoard[move.to.row][move.to.col] = move.piece;
    currentBoard[move.from.row][move.from.col] = null;
    const boardWithGravity = applyGravity(currentBoard);
    const newGameState: GameState = { ...gameSession.game_state, board: boardWithGravity, currentPlayer: gameSession.current_player === 'white' ? 'black' : 'white', moveHistory: [...gameSession.game_state.moveHistory, move], currentMoveIndex: gameSession.game_state.moveHistory.length };
    const { error } = await supabase.from('game_sessions').update({ game_state: newGameState as any, current_player: newGameState.currentPlayer }).eq('id', gameSession.id);
    if (error) {
      toast({ title: "Error", description: "Failed to make move.", variant: "destructive" });
    }
  }, [gameSession, playerInfo]);

  return { gameSession, gameState: gameSession?.game_state ?? null, playerInfo, playerPresence, isLoading, createGame, joinGame, makeMove };
}