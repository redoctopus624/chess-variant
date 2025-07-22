
export type GameRoom = {
  id: string;
  created_at?: string;
  updated_at?: string;
  white_player_id: string | null;
  black_player_id: string | null;
  current_player: 'white' | 'black';
  game_state: any; // Will store our GameState JSON
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner: 'white' | 'black' | null;
  white_player?: {
    id: string;
    email?: string;
  };
  black_player?: {
    id: string;
    email?: string;
  };
};

export type GameMove = {
  id?: string;
  game_id: string;
  player_id: string;
  move_data: any; // Will store our Move JSON
  move_number: number;
  created_at?: string;
};

export type PlayerConnection = {
  userId: string;
  gameId: string;
  color: 'white' | 'black';
  isConnected: boolean;
};
