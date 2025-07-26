import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Share, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleLobbyProps {
  onCreateGame: () => void;
  onJoinGame: (sessionId: string) => void;
}

export function SimpleLobby({ onCreateGame, onJoinGame }: SimpleLobbyProps) {
  const [gameUrl, setGameUrl] = useState('');

  const extractSessionId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('game');
    } catch {
      // If it's not a full URL, assume it's just the session ID
      return url.trim();
    }
  };

  const handleJoinGame = () => {
    const sessionId = extractSessionId(gameUrl);
    if (!sessionId) {
      toast({
        title: "Invalid Game Link",
        description: "Please enter a valid game link or ID.",
        variant: "destructive"
      });
      return;
    }
    onJoinGame(sessionId);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Multiplayer Lobby</h2>
        <p className="text-muted-foreground">Create a game or join with a friend's link!</p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            Play with Friends
          </CardTitle>
          <CardDescription>
            No login required - just share a link!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button 
              onClick={onCreateGame}
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Game
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or join with link
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Paste game link here..."
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
              />
              <Button 
                onClick={handleJoinGame}
                disabled={!gameUrl.trim()}
                variant="outline"
                className="w-full"
              >
                Join Game
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}