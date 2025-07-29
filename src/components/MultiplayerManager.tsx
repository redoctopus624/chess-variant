import React from 'react';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerGame } from './MultiplayerGame';
import { Loader2 } from 'lucide-react';

export function MultiplayerManager() {
  const {
    gameSession,
    gameState,
    playerColor,
    playerPresence,
    isLoading,
    createGame,
    joinGame,
    leaveGame,
    handleSquareClick,
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    kingInCheck,
    lastMove,
  } = useMultiplayer();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin mr-4" />
        <span className="text-xl text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (gameSession && gameState) {
    return (
      <MultiplayerGame
        gameSession={gameSession}
        gameState={gameState}
        playerColor={playerColor}
        playerPresence={playerPresence}
        onLeaveGame={leaveGame}
        onSquareClick={handleSquareClick}
        selectedSquare={selectedSquare}
        possibleMoves={possibleMoves}
        dangerousMoves={dangerousMoves}
        kingInCheck={kingInCheck}
        lastMove={lastMove}
      />
    );
  }

  return (
    <MultiplayerLobby
      onCreateGame={createGame}
      onJoinGame={joinGame}
      isLoading={isLoading}
    />
  );
}