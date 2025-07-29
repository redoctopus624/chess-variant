import React from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GameSession } from '@/types/multiplayer';
import { GameState, PieceColor, Position } from '@/types/chess';
import { Users, Crown, ArrowLeft, Copy, Share, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MultiplayerGameProps {
  gameSession: GameSession;
  gameState: GameState;
  playerColor: PieceColor | 'spectator';
  playerPresence: { white: boolean; black: boolean };
  onLeaveGame: () => void;
  onSquareClick: (row: number, col: number) => void;
  selectedSquare: Position | null;
  possibleMoves: Position[];
  dangerousMoves: Position[];
  kingInCheck: Position | null;
  lastMove?: { from: Position; to: Position };
}

export function MultiplayerGame({
  gameSession,
  gameState,
  playerColor,
  playerPresence,
  onLeaveGame,
  onSquareClick,
  selectedSquare,
  possibleMoves,
  dangerousMoves,
  kingInCheck,
  lastMove,
}: MultiplayerGameProps) {
  const isMyTurn = gameState.currentPlayer === playerColor;
  const isFlipped = playerColor === 'black';
  const gameUrl = `${window.location.origin}?game=${gameSession.id}`;

  const copyGameLink = () => {
    navigator.clipboard.writeText(gameUrl);
    toast({ title: "Link Copied!", description: "Share this link with your friend." });
  };

  const needsSecondPlayer = !gameSession.black_player_id;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onLeaveGame}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Game
        </Button>
        <Badge variant={gameSession.status === 'waiting' ? 'secondary' : 'default'}>
          Status: {gameSession.status}
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
              <CardHeader>
                <CardTitle className="text-lg">Waiting for Opponent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Share this code with a friend:</p>
                <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                  <span className="font-mono text-sm flex-1">{gameSession.id}</span>
                  <Button size="icon" variant="ghost" onClick={copyGameLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Users /> Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PlayerInfoBox
                color="White"
                isMyTurn={gameState.currentPlayer === 'white'}
                isYou={playerColor === 'white'}
                isPresent={playerPresence.white}
              />
              <PlayerInfoBox
                color="Black"
                isMyTurn={gameState.currentPlayer === 'black'}
                isYou={playerColor === 'black'}
                isPresent={playerPresence.black}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-xl font-bold capitalize">
                  {gameState.currentPlayer}'s Turn
                </div>
                {playerColor !== 'spectator' && (
                  <Badge variant={isMyTurn ? 'default' : 'secondary'}>
                    {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const PlayerInfoBox = ({ color, isMyTurn, isYou, isPresent }: { color: string, isMyTurn: boolean, isYou: boolean, isPresent: boolean }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg ${isMyTurn ? 'bg-primary/10' : 'bg-muted'}`}>
    <div className="flex items-center gap-2 font-medium">
      {color}
      {isYou && <Badge variant="secondary">You</Badge>}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{isPresent ? 'Online' : 'Offline'}</span>
      {isPresent ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
    </div>
  </div>
);