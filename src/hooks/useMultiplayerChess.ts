import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { GameRoom, GameMove, PlayerConnection } from '@/types/multiplayer';
import { GameState, Move, PieceColor } from '@/types/chess';
import { createInitialGameState, applyGravity, cloneBoard } from '@/utils/chess';
import { toast } from '@/hooks/use-toast';

export function useMultiplayerChess(gameId?: string) {
  const supabase = useSupabase();
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [playerConnection, setPlayerConnection] = useState<PlayerConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);

  // Initialize game room subscription
  useEffect(() => {
    if (!gameId) return;

    const fetchGameRoom = async () => {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          white_player:white_player_id(id, email),
          black_player:black_player_id(id, email)
        `)
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game room:', error);
        return;
      }

      setGameRoom(room as unknown as GameRoom);
      if (room.game_state) {
        setGameState(room.game_state as unknown as GameState);
      }
    };

    fetchGameRoom();

    // Subscribe to game room changes
    const roomSubscription = supabase
      .channel(`game-room-${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        console.log('Game room update:', payload);
        if (payload.new && typeof payload.new === 'object') {
          const updatedRoom = payload.new as unknown as GameRoom;
          setGameRoom(updatedRoom);
          if (updatedRoom.game_state) {
            setGameState(updatedRoom.game_state as unknown as GameState);
          }
        }
      })
      .subscribe();

    // Subscribe to moves
    const movesSubscription = supabase
      .channel(`game-moves-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_moves',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log('New move:', payload);
        // Move will be handled by game state update from game_rooms table
      })
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      movesSubscription.unsubscribe();
    };
  }, [gameId, supabase]);

  // Create a new game room
  const createGameRoom = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a game room.",
        variant: "destructive"
      });
      return null;
    }

    const { data: room, error } = await supabase
      .from('game_rooms')
      .insert([{
        white_player_id: user.id,
        black_player_id: null,
        current_player: 'white',
        game_state: createInitialGameState(),
        status: 'waiting'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating game room:', error);
      toast({
        title: "Error",
        description: "Failed to create game room.",
        variant: "destructive"
      });
      return null;
    }

    setPlayerConnection({
      userId: user.id,
      gameId: room.id,
      color: 'white',
      isConnected: true
    });

    toast({
      title: "Game Room Created",
      description: `Room ID: ${room.id}. Share this with your opponent!`
    });

    return room.id;
  }, [supabase]);

  // Join an existing game room
  const joinGameRoom = useCallback(async (roomId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a game room.",
        variant: "destructive"
      });
      return false;
    }

    // First check if room exists and has space
    const { data: room, error: fetchError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError || !room) {
      toast({
        title: "Room Not Found",
        description: "The game room doesn't exist or is no longer available.",
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
      .eq('id', roomId);

    if (error) {
      console.error('Error joining game room:', error);
      toast({
        title: "Error",
        description: "Failed to join game room.",
        variant: "destructive"
      });
      return false;
    }

    setPlayerConnection({
      userId: user.id,
      gameId: roomId,
      color: 'black',
      isConnected: true
    });

    toast({
      title: "Joined Game",
      description: "Successfully joined the game as Black player!"
    });

    return true;
  }, [supabase]);

  // Make a move in multiplayer game
  const makeMultiplayerMove = useCallback(async (move: Move): Promise<boolean> => {
    if (!gameRoom || !playerConnection) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verify it's the player's turn
    if (gameState.currentPlayer !== playerConnection.color) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your opponent to make their move.",
        variant: "destructive"
      });
      return false;
    }

    // Apply the move to create new game state
    const newBoard = cloneBoard(gameState.board);
    
    // Make the move
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
      // Save the move
      const { error: moveError } = await supabase
        .from('game_moves')
        .insert([{
          game_id: gameRoom.id,
          player_id: user.id,
          move_data: move,
          move_number: gameState.moveHistory.length + 1
        }]);

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

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      toast({
        title: "Move Failed",
        description: "Failed to make move. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [gameRoom, playerConnection, gameState, supabase]);

  // Fetch available game rooms
  const fetchAvailableRooms = useCallback(async () => {
    const { data: rooms, error } = await supabase
      .from('game_rooms')
      .select(`
        *,
        white_player:white_player_id(id, email),
        black_player:black_player_id(id, email)
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      return;
    }

    setAvailableRooms((rooms || []) as unknown as GameRoom[]);
  }, [supabase]);

  return {
    gameRoom,
    gameState,
    playerConnection,
    isConnected,
    availableRooms,
    createGameRoom,
    joinGameRoom,
    makeMultiplayerMove,
    fetchAvailableRooms
  };
}
