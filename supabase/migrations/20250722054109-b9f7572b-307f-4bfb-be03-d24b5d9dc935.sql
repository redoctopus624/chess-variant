-- Create game_rooms table for multiplayer chess games
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  white_player_id UUID REFERENCES auth.users(id),
  black_player_id UUID REFERENCES auth.users(id),
  current_player TEXT NOT NULL CHECK (current_player IN ('white', 'black')) DEFAULT 'white',
  game_state JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')) DEFAULT 'waiting',
  winner TEXT CHECK (winner IN ('white', 'black'))
);

-- Create game_moves table for storing move history
CREATE TABLE public.game_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  game_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  move_data JSONB NOT NULL,
  move_number INTEGER NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rooms
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create game rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their games" 
ON public.game_rooms 
FOR UPDATE 
USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

-- RLS Policies for game_moves
CREATE POLICY "Anyone can view game moves" 
ON public.game_moves 
FOR SELECT 
USING (true);

CREATE POLICY "Players can insert moves in their games" 
ON public.game_moves 
FOR INSERT 
WITH CHECK (
  auth.uid() = player_id AND 
  EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = game_id 
    AND (white_player_id = auth.uid() OR black_player_id = auth.uid())
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for game_rooms and game_moves
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.game_moves REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.game_rooms;
ALTER publication supabase_realtime ADD TABLE public.game_moves;