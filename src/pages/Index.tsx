
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { GameControls } from '@/components/GameControls';
import { GameInfo } from '@/components/GameInfo';
import { PromotionDialog } from '@/components/PromotionDialog';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { MultiplayerGameBoard } from '@/components/MultiplayerGameBoard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Users, User } from 'lucide-react';
import { useGravityChess } from '@/hooks/useGravityChess';
import { useMultiplayerChess } from '@/hooks/useMultiplayerChess';
import { useMultiplayerGameLogic } from '@/hooks/useMultiplayerGameLogic';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const gameIdFromUrl = searchParams.get('game');
  
  // Set initial state based on URL
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // Single player game hook
  const singlePlayerGame = useGravityChess();

  // Multiplayer game hook
  const multiplayerGame = useMultiplayerChess(currentGameId || undefined);
  
  // Multiplayer game logic (separate from single player)
  const multiplayerGameLogic = useMultiplayerGameLogic(
    multiplayerGame.gameState, 
    multiplayerGame.playerConnection?.color || 'white'
  );

  // Handle URL changes for game sharing - this should run first
  useEffect(() => {
    console.log('URL effect - gameIdFromUrl:', gameIdFromUrl);
    if (gameIdFromUrl) {
      setCurrentGameId(gameIdFromUrl);
      setGameMode('multi');
      console.log('Set gameMode to multi and currentGameId to:', gameIdFromUrl);
    } else {
      setCurrentGameId(null);
      setGameMode('single');
    }
  }, [gameIdFromUrl]);

  // Debug multiplayer state
  useEffect(() => {
    console.log('Multiplayer debug:', {
      gameMode,
      currentGameId,
      gameIdFromUrl,
      gameRoom: multiplayerGame.gameRoom,
      playerConnection: multiplayerGame.playerConnection,
      hasGameState: !!multiplayerGame.gameState
    });
  }, [gameMode, currentGameId, gameIdFromUrl, multiplayerGame.gameRoom, multiplayerGame.playerConnection, multiplayerGame.gameState]);

  const handleGameStart = (gameId: string) => {
    setCurrentGameId(gameId);
    setGameMode('multi');
    // Update URL to make it shareable
    setSearchParams({ game: gameId });
  };

  const handleLeaveGame = () => {
    setCurrentGameId(null);
    setGameMode('single');
    // Clear URL params
    setSearchParams({});
  };

  const handleMultiplayerMove = async (row: number, col: number) => {
    if (!multiplayerGame.gameRoom || !multiplayerGame.playerConnection) return;

    // Use the dedicated multiplayer game logic
    const result = multiplayerGameLogic.handleSquareClick(row, col);
    
    if (result.isMove && result.move) {
      const success = await multiplayerGame.makeMultiplayerMove(result.move);
      if (!success) {
        // If move failed, we might want to re-select the piece
        console.log('Move failed, keeping selection');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-gravity bg-clip-text text-transparent mb-4 animate-float">
            ⚡ Gravity Chess ⚡
          </h1>
          <p className="text-xl text-muted-foreground">
            Where physics meets strategy - pieces fall to their gravity zones!
          </p>
        </div>

        {/* Game Mode Selection - only show if not in a specific game */}
        {!currentGameId && (
          <div className="max-w-2xl mx-auto mb-8">
            <Tabs value={gameMode} onValueChange={(value) => setGameMode(value as 'single' | 'multi')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Single Player
                </TabsTrigger>
                <TabsTrigger value="multi" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Multiplayer
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="multi" className="mt-6">
                <MultiplayerLobby onGameStart={handleGameStart} />
              </TabsContent>
            </Tabs>
          </div>
        )}


        {/* Multiplayer Game Board - Show when we have a current game ID */}
        {gameMode === 'multi' && currentGameId && (
          <>
            {/* Show loading state while waiting for game room data */}
            {!multiplayerGame.gameRoom || !multiplayerGame.playerConnection ? (
              <div className="max-w-2xl mx-auto text-center py-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-4">Loading game...</p>
              </div>
            ) : (
              /* Show game board when room data is loaded */
              <MultiplayerGameBoard
                gameRoom={multiplayerGame.gameRoom}
                gameState={multiplayerGame.gameState}
                playerConnection={multiplayerGame.playerConnection}
                selectedSquare={multiplayerGameLogic.selectedSquare}
                possibleMoves={multiplayerGameLogic.possibleMoves}
                dangerousMoves={multiplayerGameLogic.dangerousMoves}
                onSquareClick={handleMultiplayerMove}
                kingInCheck={multiplayerGameLogic.kingInCheck}
                lastMove={multiplayerGameLogic.lastMove}
                onLeaveGame={handleLeaveGame}
                connectedPlayers={multiplayerGame.presence.connectedPlayers}
                isOpponentConnected={multiplayerGame.presence.isOpponentConnected()}
              />
            )}
          </>
        )}

        {/* Show multiplayer lobby only if not in a specific game */}
        {gameMode === 'multi' && !currentGameId && (
          <div className="max-w-2xl mx-auto">
            <MultiplayerLobby onGameStart={handleGameStart} />
          </div>
        )}

        {/* Single Player Game */}
        {gameMode === 'single' && (
          <div className="flex flex-col items-center space-y-8">
            {/* Game Board */}
            <div className="w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  {singlePlayerGame.isFlipped ? 'Black\'s perspective' : 'White\'s perspective'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={singlePlayerGame.toggleBoardFlip}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Flip Board
                </Button>
              </div>
              
              <ChessBoard
                board={singlePlayerGame.gameState.board}
                selectedSquare={singlePlayerGame.selectedSquare}
                possibleMoves={singlePlayerGame.possibleMoves}
                dangerousMoves={singlePlayerGame.dangerousMoves}
                onSquareClick={singlePlayerGame.handleSquareClick}
                kingInCheck={singlePlayerGame.kingInCheck}
                lastMove={singlePlayerGame.lastMove}
                isReplayMode={singlePlayerGame.gameState.isReplayMode}
                isFlipped={singlePlayerGame.isFlipped}
              />
            </div>

            {/* Game Controls */}
            <div className="w-full max-w-2xl">
              <GameControls
                gameState={singlePlayerGame.gameState}
                onPreviousMove={singlePlayerGame.goToPreviousMove}
                onNextMove={singlePlayerGame.goToNextMove}
                onResetGame={singlePlayerGame.resetGame}
                onImportFen={singlePlayerGame.importFromFen}
                onContinueFromCurrent={singlePlayerGame.continueFromCurrentMove}
                canNavigateBack={singlePlayerGame.canNavigateBack}
                canNavigateForward={singlePlayerGame.canNavigateForward}
              />
            </div>

            {/* Game Info */}
            <div className="w-full max-w-2xl">
              <GameInfo gameState={singlePlayerGame.gameState} />
            </div>
          </div>
        )}

        {/* Promotion Dialog */}
        <PromotionDialog
          isOpen={singlePlayerGame.promotionState.isOpen}
          color={singlePlayerGame.promotionState.color}
          onSelect={singlePlayerGame.handlePromotion}
        />
      </div>
    </div>
  );
};

export default Index;
