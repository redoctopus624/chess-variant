import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Move } from '@/types/chess';
import { GameSession, PlayerInfo } from '@/types/multiplayer';
import { createInitialGameState, applyGravity, cloneBoard } from '@/utils/chess';

// Simple in-memory storage for demo (in real app, would use a backend)
const gameSessions = new Map<string, GameSession>();
const playerConnections = new Map<string, PlayerInfo>();

export function useSimpleMultiplayer(sessionId?: string) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [isConnected, setIsConnected] = useState(false);
  const [playerPresence, setPlayerPresence] = useState<{
    white: boolean;
    black: boolean;
  }>({ white: false, black: false });

  const playerIdRef = useRef<string>(generatePlayerId());
  const intervalRef = useRef<NodeJS.Timeout>();

  function generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function generateSessionId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new game session
  const createSession = useCallback((): string => {
    const newSessionId = generateSessionId();
    const newSession: GameSession = {
      id: newSessionId,
      gameState: createInitialGameState(),
      whitePlayerId: playerIdRef.current,
      blackPlayerId: null,
      currentPlayer: 'white',
      lastMoveAt: Date.now(),
      createdAt: Date.now()
    };

    gameSessions.set(newSessionId, newSession);
    
    const newPlayerInfo: PlayerInfo = {
      id: playerIdRef.current,
      sessionId: newSessionId,
      color: 'white',
      isConnected: true
    };
    
    playerConnections.set(playerIdRef.current, newPlayerInfo);
    
    return newSessionId;
  }, []);

  // Join an existing session
  const joinSession = useCallback((sessionId: string): boolean => {
    const session = gameSessions.get(sessionId);
    if (!session) return false;

    // Check if there's space for another player
    if (session.blackPlayerId) return false;

    // Join as black player
    session.blackPlayerId = playerIdRef.current;
    gameSessions.set(sessionId, session);

    const newPlayerInfo: PlayerInfo = {
      id: playerIdRef.current,
      sessionId: sessionId,
      color: 'black',
      isConnected: true
    };
    
    playerConnections.set(playerIdRef.current, newPlayerInfo);
    
    return true;
  }, []);

  // Make a move
  const makeMove = useCallback((move: Move): boolean => {
    if (!gameSession || !playerInfo) return false;

    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerInfo.color) return false;

    // Create new game state
    const newBoard = cloneBoard(gameState.board);
    newBoard[move.to.row][move.to.col] = move.piece;
    newBoard[move.from.row][move.from.col] = null;
    
    // Apply gravity
    const boardWithGravity = applyGravity(newBoard);
    
    const newGameState: GameState = {
      ...gameState,
      board: boardWithGravity,
      currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
      moveHistory: [...gameState.moveHistory, move],
      currentMoveIndex: gameState.moveHistory.length
    };

    // Update session
    const updatedSession: GameSession = {
      ...gameSession,
      gameState: newGameState,
      currentPlayer: newGameState.currentPlayer,
      lastMoveAt: Date.now()
    };

    gameSessions.set(gameSession.id, updatedSession);
    setGameSession(updatedSession);
    setGameState(newGameState);

    return true;
  }, [gameSession, playerInfo, gameState]);

  // Initialize connection
  useEffect(() => {
    if (!sessionId) return;

    // Try to get existing session
    let session = gameSessions.get(sessionId);
    
    if (!session) {
      // Session doesn't exist, can't join
      return;
    }

    // Determine player color
    let color: 'white' | 'black' | null = null;
    if (session.whitePlayerId === playerIdRef.current) {
      color = 'white';
    } else if (session.blackPlayerId === playerIdRef.current) {
      color = 'black';
    } else if (!session.blackPlayerId) {
      // Join as black player
      session.blackPlayerId = playerIdRef.current;
      color = 'black';
      gameSessions.set(sessionId, session);
    }

    if (color) {
      const newPlayerInfo: PlayerInfo = {
        id: playerIdRef.current,
        sessionId: sessionId,
        color: color,
        isConnected: true
      };
      
      playerConnections.set(playerIdRef.current, newPlayerInfo);
      setPlayerInfo(newPlayerInfo);
      setGameSession(session);
      setGameState(session.gameState);
      setIsConnected(true);
    }
  }, [sessionId]);

  // Poll for updates (in real app, would use WebSocket)
  useEffect(() => {
    if (!sessionId || !isConnected) return;

    intervalRef.current = setInterval(() => {
      const session = gameSessions.get(sessionId);
      if (session) {
        setGameSession(session);
        setGameState(session.gameState);
        
        // Update presence
        const presence = { white: false, black: false };
        if (session.whitePlayerId) {
          const whitePlayer = playerConnections.get(session.whitePlayerId);
          presence.white = whitePlayer?.isConnected || false;
        }
        if (session.blackPlayerId) {
          const blackPlayer = playerConnections.get(session.blackPlayerId);
          presence.black = blackPlayer?.isConnected || false;
        }
        setPlayerPresence(presence);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerInfo) {
        const connection = playerConnections.get(playerInfo.id);
        if (connection) {
          connection.isConnected = false;
          playerConnections.set(playerInfo.id, connection);
        }
      }
    };
  }, [playerInfo]);

  return {
    gameSession,
    gameState,
    playerInfo,
    playerPresence,
    isConnected,
    createSession,
    joinSession,
    makeMove
  };
}