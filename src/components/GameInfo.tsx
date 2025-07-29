import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameState, PieceColor } from '@/types/chess';
import { Crown, AlertTriangle, Play, Clock } from 'lucide-react';

interface GameInfoProps {
  gameState: GameState;
}

export function GameInfo({ gameState }: GameInfoProps) {
  const getTurnInfo = () => {
    if (gameState.gameOver) {
      return {
        text: `${gameState.winner === 'white' ? 'White' : 'Black'} Wins!`,
        color: gameState.winner === 'white' ? 'text-foreground' : 'text-white',
        icon: <Crown className="h-4 w-4" />,
        bgColor: 'bg-gravity-success'
      };
    }

    if (gameState.isReplayMode) {
      return {
        text: `Replay Mode - ${gameState.currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`,
        color: 'text-gravity-warning',
        icon: <Play className="h-4 w-4" />,
        bgColor: 'bg-gravity-warning/10'
      };
    }

    return {
      text: `${gameState.currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`,
      color: gameState.currentPlayer === 'white' ? 'text-foreground' : 'text-white',
      icon: <Clock className="h-4 w-4" />,
      bgColor: 'bg-gravity-primary/10'
    };
  };

  const turnInfo = getTurnInfo();

  return (
    <Card className="bg-card/50 backdrop-blur border-gravity-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-gravity-primary">
          <AlertTriangle className="h-5 w-5" />
          Gravity Chess
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Turn */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${turnInfo.bgColor}`}>
          {turnInfo.icon}
          <span className={`font-bold ${turnInfo.color}`}>
            {turnInfo.text}
          </span>
        </div>

        {gameState.isReplayMode && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gravity-warning/20 border border-gravity-warning/30">
            <AlertTriangle className="h-4 w-4 text-gravity-warning" />
            <span className="text-gravity-warning font-medium">
              You're viewing move history. Click "Continue from here" to resume playing.
            </span>
          </div>
        )}

        {/* Rules */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">Gravity Chess Rules:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>All pieces except pawns fall to their gravity zone</li>
            <li><Badge variant="outline" className="mx-1">White</Badge> pieces fall to rank 4 (bottom half)</li>
            <li><Badge variant="outline" className="mx-1">Black</Badge> pieces fall to rank 5 (top half)</li>
            <li>Pawns act as floors - pieces stop falling on pawns</li>
            <li>Pieces stack on each other in the same file</li>
            <li>Pawns promote and then fall due to gravity</li>
            <li>En passant and castling work normally</li>
            <li>Capture the enemy king to win!</li>
          </ul>
        </div>

        {/* Move Counter */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Total Moves:</span>
          <Badge variant="secondary">{gameState.moveHistory.length}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}