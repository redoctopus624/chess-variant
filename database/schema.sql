
-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  white_player_id UUID REFERENCES auth.users(id),
  black_player_id UUID REFERENCES auth.users(id),
  current_player TEXT NOT NULL DEFAULT 'white' CHECK (current_player IN ('white', 'black')),
  game_state JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  winner TEXT CHECK (winner IN ('white', 'black'))
);

-- Create game_moves table
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  game_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  move_data JSONB NOT NULL,
  move_number INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_players ON game_rooms(white_player_id, black_player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON game_moves(player_id);

-- Enable RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rooms
CREATE POLICY "Users can view game rooms they're part of" ON game_rooms
  FOR SELECT USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id OR
    status = 'waiting'
  );

CREATE POLICY "Users can create game rooms" ON game_rooms
  FOR INSERT WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their game rooms" ON game_rooms
  FOR UPDATE USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- RLS Policies for game_moves
CREATE POLICY "Users can view moves from their games" ON game_moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_rooms 
      WHERE game_rooms.id = game_moves.game_id 
      AND (auth.uid() = white_player_id OR auth.uid() = black_player_id)
    )
  );

CREATE POLICY "Players can insert moves in their games" ON game_moves
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM game_rooms 
      WHERE game_rooms.id = game_moves.game_id 
      AND (auth.uid() = white_player_id OR auth.uid() = black_player_id)
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
