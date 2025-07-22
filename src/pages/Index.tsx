
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

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const gameIdFromUrl = searchParams.get('game');
  
  const [gameMode, setGameMode] = useState<'single' | 'multi'>(gameIdFromUrl ? 'multi' : 'single');
  const [currentGameId, setCurrentGameId] = useState<string | null>(gameIdFromUrl);

  // Single player game hook
  const singlePlayerGame = useGravityChess();

  // Multiplayer game hook
  const multiplayerGame = useMultiplayerChess(currentGameId || undefined);

  // Handle URL changes for game sharing
  useEffect(() => {
    if (gameIdFromUrl && !currentGameId) {
      setCurrentGameId(gameIdFromUrl);
      setGameMode('multi');
    }
  }, [gameIdFromUrl, currentGameId]);

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

    const { gameState } = multiplayerGame;
    const clickedPiece = gameState.board[row][col];
    const targetPosition = { row, col };

    // Check if we have a selected square and this is a valid move
    if (singlePlayerGame.selectedSquare && 
        singlePlayerGame.possibleMoves.some(pos => pos.row === row && pos.col === col)) {
      
      const piece = gameState.board[singlePlayerGame.selectedSquare.row][singlePlayerGame.selectedSquare.col];
      
      if (piece) {
        const move = {
          from: singlePlayerGame.selectedSquare,
          to: targetPosition,
          piece,
          capturedPiece: clickedPiece || undefined
        };

        const success = await multiplayerGame.makeMultiplayerMove(move);
        
        if (success) {
          // Clear selection after successful move
          singlePlayerGame.handleSquareClick(-1, -1);
        }
        return;
      }
    }
    
    // Handle piece selection using single player logic for move validation
    singlePlayerGame.handleSquareClick(row, col);
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

        {/* Multiplayer Game Board */}
        {gameMode === 'multi' && currentGameId && multiplayerGame.gameRoom && multiplayerGame.playerConnection && (
          <MultiplayerGameBoard
            gameRoom={multiplayerGame.gameRoom}
            gameState={multiplayerGame.gameState}
            playerConnection={multiplayerGame.playerConnection}
            selectedSquare={singlePlayerGame.selectedSquare}
            possibleMoves={singlePlayerGame.possibleMoves}
            dangerousMoves={singlePlayerGame.dangerousMoves}
            onSquareClick={handleMultiplayerMove}
            kingInCheck={singlePlayerGame.kingInCheck}
            lastMove={singlePlayerGame.lastMove}
            onLeaveGame={handleLeaveGame}
          />
        )}

        {/* Show multiplayer lobby if in multi mode but no active game */}
        {gameMode === 'multi' && !multiplayerGame.gameRoom && (
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
