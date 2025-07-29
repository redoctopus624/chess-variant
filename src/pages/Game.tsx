import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { DebugPanel } from '@/components/DebugPanel';
import { supabase } from '@/integrations/supabase/client';

export function MultiplayerGame() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [connectionState, setConnectionState] = useState({
    connected: false,
    loading: true,
    error: null
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setConnectionState({ connected: false, loading: true, error: null });
        
        // Fetch initial game state
        const { data, error: fetchError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Game not found');

        setGameState(data.game_state);
        setConnectionState({ connected: true, loading: false, error: null });

        // Set up real-time subscription
        const subscription = supabase
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
              setGameState(payload.new.game_state);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      } catch (err) {
        console.error('Game load error:', err);
        setError(err);
        setConnectionState({ connected: false, loading: false, error: err.message });
      }
    };

    loadGame();
  }, [gameId]);

  if (connectionState.loading) {
    return <div>Loading game...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <h2>Error loading game</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <h1>Gravity Chess</h1>
      <p>Where physics meets strategy - pieces fall to their gravity zones!</p>
      
      {gameState ? (
        <ChessBoard 
          board={gameState.board}
          // ... other props
        />
      ) : (
        <div>Waiting for game data...</div>
      )}

      {/* Debug panel - can be toggled in production with a query param */}
      {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true')) && (
        <DebugPanel 
          gameState={gameState}
          connectionState={connectionState}
          error={error}
        />
      )}
    </div>
  );
}