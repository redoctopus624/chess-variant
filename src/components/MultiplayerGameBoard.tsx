
import React from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameRoom, PlayerConnection } from '@/types/multiplayer';
import { GameState, Position } from '@/types/chess';
import { Users, Crown, Clock, ArrowLeft, Copy, Share } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MultiplayerGameBoardProps {
  gameRoom: GameRoom;
  gameState: GameState;
  playerConnection: PlayerConnection;
  selectedSquare: Position | null;
  possibleMoves: Position[];
  dangerousMoves: Position[];
  onSquareClick: (row: number, col: number) => void;
  kingInCheck: Position | null;
  lastMove: { from: Position; to: Position } | null;
  onLeaveGame: () => void;
}

export function MultiplayerGameBoard({
  gameRoom,
  gameState,
  playerConnection,
  selectedSquare,
  possibleMoves,
  dangerousMoves,
  onSquareClick,
  kingInCheck,
  lastMove,
  onLeaveGame
}: MultiplayerGameBoardProps) {
  const isMyTurn = gameState.currentPlayer === playerConnection.color;
  const isFlipped = playerConnection.color === 'black';
  const gameUrl = `${window.location.origin}?game=${gameRoom.id}`;

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onLeaveGame}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Game
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold">Multiplayer Game</h2>
          <p className="text-muted-foreground">Room: {gameRoom.id}</p>
        </div>

        <Badge variant={gameRoom.status === 'active' ? 'default' : 'secondary'}>
          {gameRoom.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Game Board */}
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

        {/* Game Info Sidebar */}
        <div className="space-y-4">
          {/* Share Game Link */}
          {gameRoom.status === 'waiting' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Share className="w-5 h-5" />
                  Invite Friend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Share this link with your friend to start playing:
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

          {/* Players */}
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
                <div>
                  <div className="font-medium">White</div>
                  <div className="text-sm text-muted-foreground">
                    {gameRoom.white_player_id ? 'Connected' : 'Waiting...'}
                  </div>
                  {playerConnection.color === 'white' && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                {gameState.currentPlayer === 'white' && (
                  <Crown className="w-4 h-4 text-blue-600" />
                )}
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${
                gameState.currentPlayer === 'black' ? 'bg-blue-50 border border-blue-200' : 'bg-muted'
              }`}>
                <div>
                  <div className="font-medium">Black</div>
                  <div className="text-sm text-muted-foreground">
                    {gameRoom.black_player_id ? 'Connected' : 'Waiting for player...'}
                  </div>
                  {playerConnection.color === 'black' && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                {gameState.currentPlayer === 'black' && (
                  <Crown className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Turn */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
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
                {gameRoom.status === 'waiting' && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for second player to join...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Status */}
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

          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>You</span>
                  <Badge variant="default">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Opponent</span>
                  <Badge variant={gameRoom.status === 'active' ? 'default' : 'secondary'}>
                    {gameRoom.status === 'active' ? 'Connected' : 'Waiting'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
