import React, { useState } from 'react';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { MultiplayerLobby } from './MultiplayerLobby';
import { MultiplayerGame } from './MultiplayerGame';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function MultiplayerManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLobbyLoading, setIsLobbyLoading] = useState(false);

  const {
    gameSession,
    gameState,
    playerColor,
    playerPresence,
    isLoading: isGameLoading,
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

  const handleCreateGame = async () => {
    setIsLobbyLoading(true);
    const newGameId = await createGame();
    if (newGameId) {
      setSearchParams({ game: newGameId });
    }
    setIsLobbyLoading(false);
  };

  const handleJoinGame = async (id: string) => {
    if (!id.trim()) return;
    setIsLobbyLoading(true);
    const success = await joinGame(id);
    if (success) {
      setSearchParams({ game: id });
    }
    setIsLobbyLoading(false);
  };

  if (isGameLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin mr-4" />
        <span className="text-xl text-muted-foreground">Loading Game...</span>
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
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
      isLoading={isLobbyLoading}
    />
  );
}