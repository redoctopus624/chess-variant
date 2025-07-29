import React from 'react';
import { useParams } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { ConnectionDebugger } from '@/components/ConnectionDebugger';
import { useMultiplayerConnection } from '@/hooks/useMultiplayerConnection';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function MultiplayerGame() {
  const { gameId } = useParams();
  const {
    gameState,
    connectionState,
    debugLog,
    reconnect
  } = useMultiplayerConnection(gameId);

  if (connectionState.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Connection Failed</h1>
        <p className="text-red-500 mb-6">{connectionState.error?.message}</p>
        <Button onClick={reconnect}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Gravity Chess</h1>
        <p className="text-gray-500 mb-6">
          {gameId ? `Game ID: ${gameId}` : 'No game ID provided'}
        </p>

        {connectionState.status === 'connecting' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin mr-2" />
            Connecting to game...
          </div>
        )}

        {gameState && connectionState.status === 'connected' ? (
          <ChessBoard 
            board={gameState.board}
            // Pass other required props
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            {connectionState.status === 'disconnected' 
              ? 'Connection lost. Trying to reconnect...' 
              : 'Loading game...'}
          </div>
        )}
      </div>

      <ConnectionDebugger 
        status={connectionState.status} 
        logs={debugLog}
        onRefresh={reconnect}
      />
    </div>
  );
}