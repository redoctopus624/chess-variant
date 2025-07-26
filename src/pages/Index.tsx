import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { GameControls } from '@/components/GameControls';
import { GameInfo } from '@/components/GameInfo';
import { PromotionDialog } from '@/components/PromotionDialog';
import { SimpleLobby } from '@/components/SimpleLobby';
import { SimpleGameBoard } from '@/components/SimpleGameBoard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Users, User } from 'lucide-react';
import { useGravityChess } from '@/hooks/useGravityChess';
import { useSimpleMultiplayer } from '@/hooks/useSimpleMultiplayer';
import { useSimpleGameLogic } from '@/hooks/useSimpleGameLogic';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('game');
  
  // Set initial state based on URL
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Single player game hook
  const singlePlayerGame = useGravityChess();

  // Multiplayer hooks
  const {
    gameSession,
    gameState: multiplayerGameState,
    playerInfo,
    playerPresence,
    isConnected,
    createSession,
    joinSession,
    makeMove
  } = useSimpleMultiplayer(currentSessionId);

  const isMyTurn = playerInfo && multiplayerGameState.currentPlayer === playerInfo.color;

  const {
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    kingInCheck,
    lastMove,
    handleSquareClick
  } = useSimpleGameLogic(
    multiplayerGameState,
    playerInfo?.color || null,
    !!isMyTurn,
    makeMove
  );

  // Handle URL changes for game sharing
  useEffect(() => {
    if (sessionIdFromUrl) {
      setCurrentSessionId(sessionIdFromUrl);
      setGameMode('multi');
    } else {
      setCurrentSessionId(null);
      setGameMode('single');
    }
  }, [sessionIdFromUrl]);

  const handleCreateGame = () => {
    const sessionId = createSession();
    setCurrentSessionId(sessionId);
    setGameMode('multi');
    setSearchParams({ game: sessionId });
  };

  const handleJoinGame = (sessionId: string) => {
    const success = joinSession(sessionId);
    if (success) {
      setCurrentSessionId(sessionId);
      setGameMode('multi');
      setSearchParams({ game: sessionId });
    }
  };

  const handleLeaveGame = () => {
    setCurrentSessionId(null);
    setGameMode('single');
    setSearchParams({});
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
        {!currentSessionId && (
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
                <SimpleLobby 
                  onCreateGame={handleCreateGame}
                  onJoinGame={handleJoinGame}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Multiplayer Game */}
        {gameMode === 'multi' && currentSessionId && gameSession && playerInfo && (
          <SimpleGameBoard
            gameSession={gameSession}
            gameState={multiplayerGameState}
            playerInfo={playerInfo}
            playerPresence={playerPresence}
            selectedSquare={selectedSquare}
            possibleMoves={possibleMoves}
            dangerousMoves={dangerousMoves}
            onSquareClick={handleSquareClick}
            kingInCheck={kingInCheck}
            lastMove={lastMove}
            onLeaveGame={handleLeaveGame}
          />
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