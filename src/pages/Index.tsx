import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChessBoard } from '@/components/ChessBoard';
import { GameControls } from '@/components/GameControls';
import { GameInfo } from '@/components/GameInfo';
import { PromotionDialog } from '@/components/PromotionDialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Users, Loader2 } from 'lucide-react';
import { useGravityChess } from '@/hooks/useGravityChess';
import { useRealtimeGravityChess } from '@/hooks/useRealtimeGravityChess';
import { supabase } from '@/integrations/supabase/client';
import { createInitialGameState } from '@/utils/chess';
import { getPlayerSessionId } from '@/utils/session';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('game');

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
        {gameId ? <RealtimeGame gameId={gameId} /> : <SinglePlayerGame />}
      </div>
    </div>
  );
};

const SinglePlayerGame = () => {
  const singlePlayerGame = useGravityChess();
  const navigate = useNavigate();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const handleCreateMultiplayerGame = async () => {
    setIsCreatingGame(true);
    const initialState = createInitialGameState();
    const playerId = getPlayerSessionId();
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        game_state: initialState as any,
        white_player_id: playerId,
        current_player: 'white',
        status: 'waiting',
      })
      .select()
      .single();

    setIsCreatingGame(false);

    if (error || !data) {
      toast({ title: "Error", description: "Could not create a multiplayer game. Please try again.", variant: "destructive" });
    } else {
      navigate(`/?game=${data.id}`);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 mt-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <Button onClick={handleCreateMultiplayerGame} disabled={isCreatingGame} className="bg-gravity-success hover:bg-gravity-success/90 text-black">
            {isCreatingGame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            {isCreatingGame ? 'Creating Game...' : 'Play with a Friend'}
          </Button>
          <Button variant="outline" size="sm" onClick={singlePlayerGame.toggleBoardFlip} className="flex items-center gap-2">
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
      <PromotionDialog
        isOpen={singlePlayerGame.promotionState.isOpen}
        color={singlePlayerGame.promotionState.color}
        onSelect={singlePlayerGame.handlePromotion}
      />
    </div>
  );
};

const RealtimeGame = ({ gameId }: { gameId: string }) => {
  const game = useRealtimeGravityChess(gameId);

  if (game.isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-gravity-primary" /> <span className="ml-4 text-lg">Loading Game...</span></div>;
  }

  if (game.error) {
    return <div className="text-center text-destructive p-10">{game.error}</div>;
  }

  const getStatusMessage = () => {
    if (game.gameState.status === 'waiting') {
      return "Waiting for opponent to join...";
    }
    if (game.gameState.currentPlayer !== game.playerColor && !game.gameState.gameOver) {
      return "Waiting for opponent's move...";
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="flex flex-col items-center space-y-8 mt-6">
      <div className="w-full max-w-2xl">
        {statusMessage && (
          <Card className="mb-4 bg-gravity-secondary/10 border-gravity-secondary">
            <CardContent className="p-4 flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-gravity-secondary font-medium">{statusMessage}</span>
            </CardContent>
          </Card>
        )}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {game.playerColor ? `You are playing as ${game.playerColor}` : 'You are a spectator'}
          </div>
          <Button variant="outline" size="sm" onClick={game.toggleBoardFlip} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Flip Board
          </Button>
        </div>
        <ChessBoard
          board={game.gameState.board}
          selectedSquare={game.selectedSquare}
          possibleMoves={game.possibleMoves}
          dangerousMoves={game.dangerousMoves}
          onSquareClick={game.handleSquareClick}
          kingInCheck={game.kingInCheck}
          lastMove={game.lastMove}
          isReplayMode={game.gameState.currentPlayer !== game.playerColor}
          isFlipped={game.isFlipped}
        />
      </div>
      <div className="w-full max-w-2xl">
        <GameControls
          gameState={game.gameState}
          onPreviousMove={() => {}}
          onNextMove={() => {}}
          onResetGame={() => {}}
          onImportFen={() => {}}
          onContinueFromCurrent={() => {}}
          canNavigateBack={false}
          canNavigateForward={false}
          isMultiplayer={true}
        />
      </div>
      <div className="w-full max-w-2xl">
        <GameInfo gameState={game.gameState} />
      </div>
      <PromotionDialog
        isOpen={game.promotionState.isOpen}
        color={game.promotionState.color}
        onSelect={game.handlePromotion}
      />
    </div>
  );
};

export default Index;