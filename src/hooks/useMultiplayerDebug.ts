import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMultiplayerDebug(gameId: string) {
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    setConnectionLog(prev => [...prev, `${timestamp}: ${message}`]);
    console.debug(`[MultiplayerDebug] ${message}`);
  };

  useEffect(() => {
    if (!gameId) return;

    log(`Initializing connection to game ${gameId}`);
    
    // Test database connection
    const testConnection = async () => {
      try {
        log('Testing Supabase connection...');
        const { data, error } = await supabase
          .from('game_sessions')
          .select('id')
          .limit(1);

        if (error) throw error;
        log('Supabase connection successful');
      } catch (err) {
        log(`Supabase connection failed: ${err.message}`);
      }
    };

    // Set up real-time debugging
    const channel = supabase
      .channel(`game_debug_${gameId}`)
      .on('presence', { event: 'sync' }, () => {
        log('Presence sync event received');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        const event = {
          type: payload.eventType,
          table: payload.table,
          data: payload.new,
          timestamp: new Date().toISOString()
        };
        setEvents(prev => [...prev, event]);
        log(`Received ${payload.eventType} event for game ${gameId}`);
      })
      .subscribe((status) => {
        log(`Subscription status: ${status}`);
      });

    testConnection();

    return () => {
      log('Cleaning up debug connection');
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { connectionLog, events };
}