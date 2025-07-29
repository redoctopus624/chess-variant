import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { DebugPanel } from '@/components/DebugPanel';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useMultiplayerDebug } from '@/hooks/useMultiplayerDebug';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function MultiplayerGame() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const { connectionLog, events } = useMultiplayerDebug(gameId || '');

  useEffect(() => {
    const loadGame = async () => {
      try {
        setConnectionState('connecting');
        
        // 1. Check if game exists
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameId)
          .single();

        if (error || !data) {
          throw new Error(error?.message || 'Game not found');
        }

        // 2. Set initial state
        setGameState(data.game_state);
        setConnectionState('connected');

        // 3. Set up real-time updates
        const channel = supabase
          .channel(`game_${gameId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${gameId}`
          }, (payload) => {
            setGameState(payload.new.game_state);
          })
          .subscribe(status => {
            if (status === 'SUBSCRIBED') {
              setConnectionState('connected');
            } else {
              setConnectionState('disconnected');
            }
          });

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        setConnectionState('disconnected');
        toast({
          title: "Connection Error",
          description: err.message,
          variant: "destructive"
        });
      }
    };

    if (gameId) {
      loadGame();
    }

    return () => {
      setConnectionState('disconnected');
    };
  }, [gameId]);

  return (
    <div className="relative">
      <ConnectionStatus status={connectionState} />
      
      <h1>Gravity Chess</h1>
      <p>Where physics meets strategy - pieces fall to their gravity zones!</p>
      
      {gameState ? (
        <ChessBoard board={gameState.board} />
      ) : (
        <div className="text-center py-8">
          {connectionState === 'connecting' ? (
            <p>Connecting to game...</p>
          ) : (
            <p>Failed to load game. Please check the link.</p>
          )}
        </div>
      )}

      <DebugPanel 
        gameState={gameState}
        connectionState={{
          status: connectionState,
          logs: connectionLog,
          events
        }}
      />
    </div>
  );
}