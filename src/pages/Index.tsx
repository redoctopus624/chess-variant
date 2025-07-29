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
import { RotateCcw, Users, User, Loader2 } from 'lucide-react';
import { useGravityChess } from '@/hooks/useGravityChess';
import { useSupabaseMultiplayer } from '@/hooks/useSupabaseMultiplayer';
import { useSimpleGameLogic } from '@/hooks/useSimpleGameLogic';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('game');
  
  const [gameMode, setGameMode] = useState<'single' | 'multi'>(sessionIdFromUrl ? 'multi' : 'single');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionIdFromUrl);

  // Single player game hook
  const singlePlayerGame = useGravityChess();

  // Multiplayer hooks
  const {
    gameSession,
    gameState: multiplayerGameState,
    playerInfo,
    playerPresence,
    isLoading,
    createGame,
    joinGame,
    makeMove
  } = useSupabaseMultiplayer(currentSessionId);

  const isMyTurn = playerInfo && multiplayerGameState && multiplayerGameState.currentPlayer === playerInfo.color;

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

  useEffect(() => {
    if (sessionIdFromUrl) {
      if (currentSessionId !== sessionIdFromUrl) {
        setCurrentSessionId(sessionIdFromUrl);
      }
      setGameMode('multi');
    } else {
      setGameMode('single');
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  }, [sessionIdFromUrl, currentSessionId]);

  const handleCreateGame = async () => {
    const newSessionId = await createGame();
    if (newSessionId) {
      setCurrentSessionId(newSessionId);
      setSearchParams({ game: newSessionId });
    }
  };

  const handleJoinGame = async (sessionId: string) => {
    const success = await joinGame(sessionId);
    if (success) {
      setCurrentSessionId(sessionId);
      setSearchParams({ game: sessionId });
    }
  };

  const handleLeaveGame = () => {
    setCurrentSessionId(null);
    setSearchParams({});
  };

  const renderMultiplayer = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-16">
          <Loader2 className="h-8 w-8 animate-spin mr-4" />
          <span className="text-xl text-muted-foreground">Loading Game...</span>
        </div>
      );
    }
    if (gameSession && playerInfo && multiplayerGameState) {
      return (
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
      );
    }
    return (
      <SimpleLobby 
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-gravity bg-clip-text text-transparent mb-4 animate-float">
            ⚡ Gravity Chess ⚡
          </h1>
          <p className="text-xl text-muted-foreground">
            Where physics meets strategy - pieces fall to their gravity zones!
          </p>
        </div>

        <Tabs value={gameMode} onValueChange={(value) => {
          const newMode = value as 'single' | 'multi';
          setGameMode(newMode);
          if (newMode === 'single') {
            handleLeaveGame();
          }
        }}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Single Player
            </TabsTrigger>
            <TabsTrigger value="multi" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Multiplayer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="mt-6">
            <div className="flex flex-col items-center space-y-8">
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
              <div className="w-full max-w-2xl">
                <GameInfo gameState={singlePlayerGame.gameState} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="multi" className="mt-6">
            {renderMultiplayer()}
          </TabsContent>
        </Tabs>

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