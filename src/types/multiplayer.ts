import { GameState, PieceColor } from "./chess";
import { Database } from "@/integrations/supabase/types";

export type GameSession = Database['public']['Tables']['game_sessions']['Row'];

export type PlayerInfo = {
  id: string;
  color: PieceColor | 'spectator';
};