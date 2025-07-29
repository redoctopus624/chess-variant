import { Database } from "@/integrations/supabase/types";
import { GameState } from "./chess";

export type GameSession = Database['public']['Tables']['game_sessions']['Row'] & {
  game_state: GameState; // Ensure game_state is strongly typed
};

export type PlayerInfo = {
  id: string;
  color: 'white' | 'black' | 'spectator';
};