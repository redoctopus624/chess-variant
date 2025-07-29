import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useMultiplayerConnection(gameId: string) {
  const [gameState, setGameState] = useState(null);
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected',
    error: null,
    channel: null
  });
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLog(prev => [...prev, logMessage]);
    console.debug(logMessage);
  };

  useEffect(() => {
    if (!gameId) return;

    const connect = async () => {
      try {
        log(`Initializing connection to game ${gameId}`);
        setConnectionState({ status: 'connecting', error: null, channel: null });

        // 1. Verify game exists
        log('Checking if game exists...');
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error || !data) {
          throw new Error(error?.message || 'Game not found');
        }

        log('Game found, initial state loaded');
        setGameState(data.game_state);

        // 2. Set up real-time connection
        log('Setting up real-time channel...');
        const channel = supabase
          .channel(`game:${gameId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'game_sessions',
              filter: `id=eq.${gameId}`
            },
            (payload) => {
              log('Received game state update');
              setGameState(payload.new.game_state);
            }
          )
          .on('broadcast', { event: '*' }, (payload) => {
            log(`Received broadcast: ${payload.event}`);
          })
          .subscribe((status) => {
            log(`Subscription status changed: ${status}`);
            if (status === 'SUBSCRIBED') {
              setConnectionState({ status: 'connected', error: null, channel });
              log('Successfully connected to game');
            } else {
              setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
            }
          });

        return () => {
          log('Cleaning up connection...');
          supabase.removeChannel(channel);
        };
      } catch (error) {
        log(`Connection failed: ${error.message}`);
        setConnectionState({ status: 'error', error, channel: null });
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    connect();

    // Reconnect every 30 seconds if disconnected
    const reconnectInterval = setInterval(() => {
      if (connectionState.status === 'disconnected') {
        log('Attempting to reconnect...');
        connect();
      }
    }, 30000);

    return () => {
      clearInterval(reconnectInterval);
    };
  }, [gameId]);

  return {
    gameState,
    connectionState,
    debugLog,
    reconnect: () => {
      setConnectionState({ status: 'connecting', error: null, channel: null });
    }
  };
}