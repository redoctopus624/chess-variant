import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMultiplayerChess } from '@/hooks/useMultiplayerChess';
import { useSupabase, isSupabaseConfigured } from '@/hooks/useSupabase';
import { AuthCheck } from './AuthCheck';
import { Users, Plus, LogIn, RefreshCw, AlertCircle } from 'lucide-react';
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
    availableRooms,
    createGameRoom,
    joinGameRoom,
    fetchAvailableRooms
  } = useMultiplayerChess();

  // Auto-join game if URL contains game ID and user is authenticated
  useEffect(() => {
    if (gameIdFromUrl && user && !hasTriedAutoJoin) {
      setHasTriedAutoJoin(true);
      handleJoinRoom(gameIdFromUrl);
    }
  }, [gameIdFromUrl, user, hasTriedAutoJoin]);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching available rooms...');
      fetchAvailableRooms();
    }
  }, [user, fetchAvailableRooms]);

  // Debug: Log available rooms when they change
  useEffect(() => {
    console.log('Available rooms updated:', availableRooms);
  }, [availableRooms]);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create or Join Game */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Game
            </CardTitle>
            <CardDescription>
              Start a new game and share the link with a friend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCreateRoom} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              Create New Game
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Game</CardTitle>
            <CardDescription>
              Enter a room ID to join an existing game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter Room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
            />
            <Button 
              onClick={() => handleJoinRoom()}
              disabled={isLoading || !roomIdInput.trim()}
              className="w-full"
            >
              Join Game
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Available Games */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Available Games</CardTitle>
            <CardDescription>
              Join an open game room
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAvailableRooms}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {availableRooms.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No available games. Create one to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div 
                  key={room.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Room {room.id}</div>
                    <div className="text-sm text-muted-foreground">
                      Created by: {room.white_player?.email || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      Waiting for player
                    </Badge>
                    <Button 
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={isLoading}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}