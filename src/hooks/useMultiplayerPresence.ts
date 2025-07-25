import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { toast } from '@/hooks/use-toast';

export interface PlayerPresence {
  userId: string;
  color: 'white' | 'black';
  isOnline: boolean;
  lastSeen: string;
}

export function useMultiplayerPresence(gameId: string | null, playerColor: 'white' | 'black' | null) {
  const supabase = useSupabase();
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerPresence[]>([]);
  const [isTrackingPresence, setIsTrackingPresence] = useState(false);

  const trackPresence = useCallback(async (userId: string, color: 'white' | 'black') => {
    if (!gameId || isTrackingPresence) return;

    console.log('Starting presence tracking for:', { userId, color, gameId });
    
    const channel = supabase.channel(`game-presence-${gameId}`);
    
    // Track current user's presence
    const presenceData = {
      userId,
      color,
      isOnline: true,
      lastSeen: new Date().toISOString()
    };

    // Subscribe to presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync:', state);
        
        const players: PlayerPresence[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence && typeof presence === 'object') {
              players.push({
                userId: presence.userId,
                color: presence.color,
                isOnline: presence.isOnline,
                lastSeen: presence.lastSeen
              } as PlayerPresence);
            }
          });
        });
        setConnectedPlayers(players);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', { key, newPresences });
        const newPlayer = newPresences[0] as any;
        if (newPlayer.userId !== userId) {
          toast({
            title: "Player Connected",
            description: `${newPlayer.color} player has joined the game!`,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left:', { key, leftPresences });
        const leftPlayer = leftPresences[0] as any;
        if (leftPlayer.userId !== userId) {
          toast({
            title: "Player Disconnected",
            description: `${leftPlayer.color} player has left the game.`,
            variant: "destructive"
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Presence channel subscribed, tracking presence...');
          const trackStatus = await channel.track(presenceData);
          console.log('Presence track status:', trackStatus);
          setIsTrackingPresence(true);
        }
      });

    // Cleanup function
    return () => {
      console.log('Cleaning up presence tracking');
      channel.untrack();
      channel.unsubscribe();
      setIsTrackingPresence(false);
    };
  }, [gameId, supabase, isTrackingPresence]);

  const stopTracking = useCallback(() => {
    setIsTrackingPresence(false);
    setConnectedPlayers([]);
  }, []);

  const getOpponentStatus = useCallback(() => {
    if (!playerColor) return null;
    
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    return connectedPlayers.find(p => p.color === opponentColor) || null;
  }, [connectedPlayers, playerColor]);

  const isOpponentConnected = useCallback(() => {
    const opponent = getOpponentStatus();
    return opponent?.isOnline || false;
  }, [getOpponentStatus]);

  return {
    connectedPlayers,
    isTrackingPresence,
    trackPresence,
    stopTracking,
    getOpponentStatus,
    isOpponentConnected
  };
}