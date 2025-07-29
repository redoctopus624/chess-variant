import React from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameSession, PlayerInfo } from '@/types/multiplayer';
import { GameState, Position } from '@/types/chess';
import { Users, Crown, ArrowLeft, Copy, Share, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleGameBoardProps {
  gameSession: GameSession;
  gameState: GameState;
  playerInfo: PlayerInfo;
  playerPresence: { white: boolean; black: boolean };
  selectedSquare: Position | null;
  possibleMoves: Position[];
  dangerousMoves: Position[];
  onSquareClick: (row: number, col: number) => void;
  kingInCheck: Position | null;
  lastMove: { from: Position; to: Position } | null;
  onLeaveGame: () => void;
}

export function SimpleGameBoard({
  gameSession,
  gameState,
  playerInfo,
  playerPresence,
  selectedSquare,
  possibleMoves,
  dangerousMoves,
  onSquareClick,
  kingInCheck,
  lastMove,
  onLeaveGame
}: SimpleGameBoardProps) {
  const isMyTurn = gameState.currentPlayer === playerInfo.color;
  const isFlipped = playerInfo.color === 'black';
  const gameUrl = `${window.location.origin}?game=${gameSession.id}`;

  const copyGameLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      toast({
        title: "Link Copied!",
        description: "Share this link with your friend to play together.",
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  const shareGame = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Play Gravity Chess with me!',
          text: 'Join my gravity chess game',
          url: gameUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        copyGameLink();
      }
    } else {
      copyGameLink();
    }
  };

  const needsSecondPlayer = !gameSession.black_player_id;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onLeaveGame}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Game
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold">Multiplayer Game</h2>
          <p className="text-muted-foreground text-sm">Room: {gameSession.id.slice(0, 8)}</p>
        </div>

        <Badge variant={gameSession.status === 'waiting' ? 'secondary' : 'default'}>
          {gameSession.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ChessBoard
            board={gameState.board}
            selectedSquare={selectedSquare}
            possibleMoves={possibleMoves}
            dangerousMoves={dangerousMoves}
            onSquareClick={onSquareClick}
            kingInCheck={kingInCheck}
            lastMove={lastMove}
            isReplayMode={false}
            isFlipped={isFlipped}
          />
        </div>

        <div className="space-y-4">
          {needsSecondPlayer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Share className="w-5 h-5" />
                  Invite Friend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Share this link with your friend:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={gameUrl}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyGameLink}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={shareGame}
                  className="w-full"
                  size="sm"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share Game
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                gameState.currentPlayer === 'white' ? 'bg-blue-50 border border-blue-200' : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      White
                      {playerPresence.white ? (
                        <Wifi className="w-3 h-3 text-green-600" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {playerPresence.white ? 'Online' : 'Offline'}
                    </div>
                    {playerInfo.color === 'white' && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                </div>
                {gameState.currentPlayer === 'white' && (
                  <Crown className="w-4 h-4 text-blue-600" />
                )}
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${
                gameState.currentPlayer === 'black' ? 'bg-blue-50 border border-blue-200' : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Black
                      {playerPresence.black ? (
                        <Wifi className="w-3 h-3 text-green-600" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {gameSession.black_player_id ? 
                        (playerPresence.black ? 'Online' : 'Offline') : 
                        'Waiting for player...'
                      }
                    </div>
                    {playerInfo.color === 'black' && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                </div>
                {gameState.currentPlayer === 'black' && (
                  <Crown className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                Turn Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold capitalize">
                  {gameState.currentPlayer}'s Turn
                </div>
                <Badge variant={isMyTurn ? 'default' : 'secondary'}>
                  {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
                </Badge>
                {needsSecondPlayer && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for second player to join...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {gameState.gameOver && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Game Over</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-xl font-bold mb-2">
                    {gameState.winner ? `${gameState.winner} Wins!` : 'Draw'}
                  </div>
                  <Badge variant="outline">
                    Game Completed
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}