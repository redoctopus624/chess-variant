import React from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { GameControls } from '@/components/GameControls';
import { GameInfo } from '@/components/GameInfo';
import { PromotionDialog } from '@/components/PromotionDialog';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useGravityChess } from '@/hooks/useGravityChess';

const Index = () => {
  // Single player game hook
  const singlePlayerGame = useGravityChess();

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

        <div className="flex flex-col items-center space-y-8 mt-6">
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