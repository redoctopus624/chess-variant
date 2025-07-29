export type GameSession = {
  id: string;
  gameState: any;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  currentPlayer: 'white' | 'black';
  lastMoveAt: number;
  createdAt: number;
};

export type PlayerInfo = {
  id: string;
  sessionId: string;
  color: 'white' | 'black' | null;
  isConnected: boolean;
};

export type MultiplayerMove = {
  sessionId: string;
  playerId: string;
  moveData: any;
  timestamp: number;
};