import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMultiplayerCore } from '@/hooks/useMultiplayerCore';
import { useSupabase, isSupabaseConfigured } from '@/hooks/useSupabase';
import { AuthCheck } from './AuthCheck';
import { Users, Plus, LogIn, AlertCircle } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

interface MultiplayerLobbyProps {
  onGameStart: (gameId: string) => void;
}

export function MultiplayerLobby({ onGameStart }: MultiplayerLobbyProps) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-orange-800">
              <AlertCircle className="w-6 h-6" />
              Setup Required
            </CardTitle>
            <CardDescription className="text-orange-700">
              Multiplayer features require Supabase integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-orange-100 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">To enable multiplayer:</h4>
              <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
                <li>Click the green Supabase button in the top right</li>
                <li>Connect your Supabase project</li>
                <li>Run the database schema to create game tables</li>
                <li>Refresh the page to start playing with friends!</li>
              </ol>
            </div>
            <p className="text-center text-sm text-orange-600">
              Don't have Supabase? It's free to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthCheck>
      {(user, session) => (
        <MultiplayerLobbyContent 
          user={user}
          session={session}
          onGameStart={onGameStart}
        />
      )}
    </AuthCheck>
  );
}

interface MultiplayerLobbyContentProps {
  user: User | null;
  session: Session | null;
  onGameStart: (gameId: string) => void;
}

function MultiplayerLobbyContent({ user, session, onGameStart }: MultiplayerLobbyContentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameIdFromUrl = searchParams.get('game');
  
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriedAutoJoin, setHasTriedAutoJoin] = useState(false);
  
  const {
    createGameRoom,
    joinGameRoom
  } = useMultiplayerCore();

  // Auto-join game if URL contains game ID and user is authenticated
  useEffect(() => {
    if (gameIdFromUrl && user && !hasTriedAutoJoin) {
      setHasTriedAutoJoin(true);
      handleJoinRoom(gameIdFromUrl);
    }
  }, [gameIdFromUrl, user, hasTriedAutoJoin]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    const roomId = await createGameRoom();
    if (roomId) {
      onGameStart(roomId);
    }
    setIsLoading(false);
  };

  const handleJoinRoom = async (roomId?: string) => {
    const targetRoomId = roomId || roomIdInput.trim();
    if (!targetRoomId) return;

    setIsLoading(true);
    const success = await joinGameRoom(targetRoomId);
    if (success) {
      onGameStart(targetRoomId);
    }
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="w-6 h-6" />
              Multiplayer Chess
            </CardTitle>
            <CardDescription>
              {gameIdFromUrl 
                ? 'Sign in to join the game your friend shared' 
                : 'Sign in to play with friends online'
              }
            </CardDescription>
            {gameIdFromUrl && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  🎮 You've been invited to join game: <code className="font-mono">{gameIdFromUrl}</code>
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full" size="lg">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Play
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Multiplayer Lobby</h2>
        <p className="text-muted-foreground">Welcome, {user.email}!</p>
        {gameIdFromUrl && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-700 font-medium">
              🎮 Joining game: {gameIdFromUrl}
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Play Multiplayer
          </CardTitle>
          <CardDescription>
            Create a new game or join with a shared link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button 
              onClick={handleCreateRoom} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Creating...' : 'Create New Game'}
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
                placeholder="Paste game link or room ID here..."
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleJoinRoom();
                  }
                }}
              />
              <Button 
                onClick={() => handleJoinRoom()} 
                disabled={!roomIdInput.trim() || isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? 'Joining...' : 'Join Game'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}