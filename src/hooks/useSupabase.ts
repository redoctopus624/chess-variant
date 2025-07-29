
import { supabase } from '@/integrations/supabase/client';

export function useSupabase() {
  return supabase;
}

export const isSupabaseConfigured = () => {
  return true; // Always true since we have the client configured
};
