export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'white' | 'black';
export type Piece = {
  type: PieceType;
  color: PieceColor;
};

export type Position = {
  row: number;
  col: number;
};

export type Move = {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isEnPassant?: boolean;
  isCastling?: boolean;
  isPromotion?: boolean;
  promotedTo?: PieceType;
};

export type GameState = {
  board: (Piece | null)[][];
  currentPlayer: PieceColor;
  moveHistory: Move[];
  currentMoveIndex: number;
  enPassantTarget: Position | null;
  castlingRights: {
    whiteKing: boolean;
    whiteQueenside: boolean;
    blackKing: boolean;
    blackQueenside: boolean;
  };
  gameOver: boolean;
  winner: PieceColor | null;
  isReplayMode: boolean;
  basePosition?: {
    board: (Piece | null)[][];
    currentPlayer: PieceColor;
    castlingRights: {
      whiteKing: boolean;
      whiteQueenside: boolean;
      blackKing: boolean;
      blackQueenside: boolean;
    };
    enPassantTarget: Position | null;
  };
};

export type FenData = {
  fen: string;
  board: (Piece | null)[][];
  currentPlayer: PieceColor;
  castlingRights: {
    whiteKing: boolean;
    whiteQueenside: boolean;
    blackKing: boolean;
    blackQueenside: boolean;
  };
  enPassantTarget: Position | null;
};