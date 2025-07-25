import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { GameRoom, GameMove, PlayerConnection } from '@/types/multiplayer';
import { GameState, Move } from '@/types/chess';
import { createInitialGameState, applyGravity, cloneBoard } from '@/utils/chess';
import { toast } from '@/hooks/use-toast';

export function useMultiplayerCore(gameId?: string) {
  const supabase = useSupabase();
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [playerConnection, setPlayerConnection] = useState<PlayerConnection | null>(null);
  const [playerPresence, setPlayerPresence] = useState<{
    white: boolean;
    black: boolean;
  }>({ white: false, black: false });
  const [isConnected, setIsConnected] = useState(false);
  
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  // Initialize multiplayer connection
  useEffect(() => {
    if (!gameId) return;

    const initializeConnection = async () => {
      console.log('🎮 Initializing multiplayer connection for game:', gameId);

      // Fetch initial game state
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('❌ Error fetching game room:', error);
        toast({
          title: "Game Not Found",
          description: "The game room doesn't exist.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Game room fetched:', room);
      setGameRoom(room as GameRoom);
      if (room.game_state) {
        setGameState(room.game_state as GameState);
      }

      // Determine player connection
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No authenticated user');
        return;
      }

      let playerColor: 'white' | 'black' | null = null;
      
      if (room.white_player_id === user.id) {
        playerColor = 'white';
      } else if (room.black_player_id === user.id) {
        playerColor = 'black';
      } else if (!room.black_player_id && room.status === 'waiting') {
        // Auto-join as black player
        const { data: updatedRoom, error: joinError } = await supabase
          .from('game_rooms')
          .update({
            black_player_id: user.id,
            status: 'active'
          })
          .eq('id', gameId)
          .eq('black_player_id', null) // Only if still empty
          .select()
          .single();

        if (!joinError && updatedRoom) {
          playerColor = 'black';
          setGameRoom(updatedRoom as GameRoom);
          toast({
            title: "Joined Game",
            description: "You've joined as the black player!"
          });
        }
      }

      if (playerColor) {
        setPlayerConnection({
          userId: user.id,
          gameId,
          color: playerColor,
          isConnected: true
        });
        setIsConnected(true);
        console.log('🎯 Player connected as:', playerColor);
      }

      // Set up real-time subscriptions
      setupRealtimeSubscriptions(gameId, user.id, playerColor);
    };

    initializeConnection();

    return () => {
      cleanup();
    };
  }, [gameId, supabase]);

  const setupRealtimeSubscriptions = useCallback((gameId: string, userId: string, playerColor: 'white' | 'black' | null) => {
    // Game state subscription
    channelRef.current = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        console.log('🔄 Game room update:', payload);
        if (payload.new) {
          const updatedRoom = payload.new as GameRoom;
          setGameRoom(updatedRoom);
          if (updatedRoom.game_state) {
            setGameState(updatedRoom.game_state as GameState);
          }
        }
      })
      .subscribe();

    // Presence tracking
    presenceChannelRef.current = supabase
      .channel(`presence-${gameId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current.presenceState();
        console.log('👥 Presence sync:', state);
        
        const presence = { white: false, black: false };
        Object.values(state).forEach((users: any) => {
          users.forEach((user: any) => {
            if (user.color === 'white') presence.white = true;
            if (user.color === 'black') presence.black = true;
          });
        });
        
        setPlayerPresence(presence);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 Player joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 Player left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && playerColor) {
          await presenceChannelRef.current.track({
            user_id: userId,
            color: playerColor,
            online_at: new Date().toISOString(),
          });
        }
      });
  }, [supabase]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
  }, [supabase]);

  const createGameRoom = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a game.",
        variant: "destructive"
      });
      return null;
    }

    const { data: room, error } = await supabase
      .from('game_rooms')
      .insert({
        white_player_id: user.id,
        black_player_id: null,
        current_player: 'white',
        game_state: createInitialGameState(),
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating game room:', error);
      toast({
        title: "Error",
        description: "Failed to create game room.",
        variant: "destructive"
      });
      return null;
    }

    toast({
      title: "Game Created",
      description: "Share the game link with your opponent!"
    });

    return room.id;
  }, [supabase]);

  const joinGameRoom = useCallback(async (roomId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a game.",
        variant: "destructive"
      });
      return false;
    }

    // Check if room exists and has space
    const { data: room, error: fetchError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError || !room) {
      toast({
        title: "Room Not Found",
        description: "The game room doesn't exist.",
        variant: "destructive"
      });
      return false;
    }

    if (room.black_player_id) {
      toast({
        title: "Room Full",
        description: "This game room is already full.",
        variant: "destructive"
      });
      return false;
    }

    // Join as black player
    const { error } = await supabase
      .from('game_rooms')
      .update({
        black_player_id: user.id,
        status: 'active'
      })
      .eq('id', roomId)
      .eq('black_player_id', null); // Only if still empty

    if (error) {
      console.error('❌ Error joining game room:', error);
      toast({
        title: "Failed to Join",
        description: "Could not join the game room.",
        variant: "destructive"
      });
      return false;
    }

    toast({
      title: "Joined Game",
      description: "Successfully joined as black player!"
    });

    return true;
  }, [supabase]);

  const makeMove = useCallback(async (move: Move): Promise<boolean> => {
    if (!gameRoom || !playerConnection) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verify it's the player's turn
    if (gameState.currentPlayer !== playerConnection.color) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your opponent to move.",
        variant: "destructive"
      });
      return false;
    }

    // Create new game state
    const newBoard = cloneBoard(gameState.board);
    newBoard[move.to.row][move.to.col] = move.piece;
    newBoard[move.from.row][move.from.col] = null;
    
    // Apply gravity
    const boardWithGravity = applyGravity(newBoard);
    
    const newGameState: GameState = {
      ...gameState,
      board: boardWithGravity,
      currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
      moveHistory: [...gameState.moveHistory, move],
      currentMoveIndex: gameState.moveHistory.length
    };

    try {
      // Save move first
      const { error: moveError } = await supabase
        .from('game_moves')
        .insert({
          game_id: gameRoom.id,
          player_id: user.id,
          move_data: move,
          move_number: gameState.moveHistory.length + 1
        });

      if (moveError) throw moveError;

      // Update game state
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({
          game_state: newGameState,
          current_player: newGameState.currentPlayer,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameRoom.id);

      if (roomError) throw roomError;

      console.log('✅ Move completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error making move:', error);
      toast({
        title: "Move Failed",
        description: "Failed to make move. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [gameRoom, playerConnection, gameState, supabase]);

  return {
    gameRoom,
    gameState,
    playerConnection,
    playerPresence,
    isConnected,
    createGameRoom,
    joinGameRoom,
    makeMove
  };
}