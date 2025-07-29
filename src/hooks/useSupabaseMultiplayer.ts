import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Move } from '@/types/chess';
import { GameSession, PlayerInfo } from '@/types/multiplayer';
import { createInitialGameState, applyGravity, cloneBoard } from '@/utils/chess';
import { getPlayerId } from '@/utils/player';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useSupabaseMultiplayer(sessionId: string | null) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [playerPresence, setPlayerPresence] = useState<{ white: boolean; black: boolean }>({ white: false, black: false });
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerId = getPlayerId();

  const handleGameUpdate = useCallback((payload: { new: GameSession }) => {
    setGameSession(payload.new);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const connectToGame = async () => {
      setIsLoading(true);

      // Fetch initial game data
      const { data: sessionData, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !sessionData) {
        toast({ title: "Error", description: "Game not found or could not be loaded.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      setGameSession(sessionData as GameSession);

      // Determine player role
      if (sessionData.white_player_id === playerId) {
        setPlayerInfo({ id: playerId, color: 'white' });
      } else if (sessionData.black_player_id === playerId) {
        setPlayerInfo({ id: playerId, color: 'black' });
      } else {
        setPlayerInfo({ id: playerId, color: 'spectator' });
      }

      // Subscribe to Realtime channel
      const channel = supabase.channel(`game:${sessionId}`);
      channelRef.current = channel;

      channel
        .on<GameSession>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, handleGameUpdate)
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const newPresence = { white: false, black: false };
          for (const id in presenceState) {
            const presences = presenceState[id] as unknown as { color: 'white' | 'black' }[];
            if (presences[0].color === 'white') newPresence.white = true;
            if (presences[0].color === 'black') newPresence.black = true;
          }
          setPlayerPresence(newPresence);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const color = sessionData.white_player_id === playerId ? 'white' : sessionData.black_player_id === playerId ? 'black' : 'spectator';
            await channel.track({ player_id: playerId, color });
          }
        });

      setIsLoading(false);
    };

    connectToGame();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, playerId, handleGameUpdate]);

  const createGame = useCallback(async (): Promise<string | null> => {
    const initialGameState = createInitialGameState();
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        white_player_id: playerId,
        game_state: initialGameState as any,
        current_player: 'white',
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Could not create game.", variant: "destructive" });
      return null;
    }
    return data.id;
  }, [playerId]);

  const joinGame = useCallback(async (joinSessionId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ black_player_id: playerId, status: 'active' })
      .eq('id', joinSessionId)
      .is('black_player_id', null)
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Error", description: "Could not join game. It might be full or no longer exist.", variant: "destructive" });
      return false;
    }
    return true;
  }, [playerId]);

  const makeMove = useCallback(async (move: Move) => {
    if (!gameSession || !playerInfo || playerInfo.color === 'spectator' || gameSession.current_player !== playerInfo.color) {
      return;
    }

    const currentBoard = cloneBoard(gameSession.game_state.board);
    currentBoard[move.to.row][move.to.col] = move.piece;
    currentBoard[move.from.row][move.from.col] = null;
    const boardWithGravity = applyGravity(currentBoard);

    const newGameState: GameState = {
      ...gameSession.game_state,
      board: boardWithGravity,
      currentPlayer: gameSession.current_player === 'white' ? 'black' : 'white',
      moveHistory: [...gameSession.game_state.moveHistory, move],
      currentMoveIndex: gameSession.game_state.moveHistory.length,
    };

    const { error } = await supabase
      .from('game_sessions')
      .update({
        game_state: newGameState as any,
        current_player: newGameState.currentPlayer
      })
      .eq('id', gameSession.id);

    if (error) {
      toast({ title: "Error", description: "Failed to make move.", variant: "destructive" });
    }
  }, [gameSession, playerInfo]);

  return {
    gameSession,
    gameState: gameSession?.game_state ?? null,
    playerInfo,
    playerPresence,
    isLoading,
    createGame,
    joinGame,
    makeMove,
  };
}