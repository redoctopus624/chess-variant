import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';

interface MultiplayerLobbyProps {
  onCreateGame: () => void;
  onJoinGame: (sessionId: string) => void;
  isLoading: boolean;
}

export function MultiplayerLobby({ onCreateGame, onJoinGame, isLoading }: MultiplayerLobbyProps) {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            Play with a Friend
          </CardTitle>
          <CardDescription>
            Create a new game or join with a code.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button onClick={onCreateGame} disabled={isLoading} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create New Game'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Input
              placeholder="Enter game code to join"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              disabled={isLoading}
            />
            <Button 
              onClick={() => onJoinGame(joinId)}
              disabled={isLoading || !joinId.trim()}
              variant="secondary"
              className="w-full"
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}