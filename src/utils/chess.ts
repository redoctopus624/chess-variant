import { Piece, PieceType, PieceColor, Position, Move, GameState, FenData } from '@/types/chess';

// Chess piece images - using new white pieces
import whiteKing from '/lovable-uploads/36a07db3-be8f-40e6-9341-ecf48144fb62.png';
import whiteQueen from '/lovable-uploads/60910572-e754-4d01-86ea-54207a8ff3f9.png';
import whiteRook from '/lovable-uploads/46fcee69-373f-4bdf-b5a5-6acfe288cdd8.png';
import whiteBishop from '/lovable-uploads/4e2d9180-4011-47ab-ae7b-7809b9eb5b88.png';
import whiteKnight from '/lovable-uploads/fc00f2dd-bf73-4a0d-b36f-32a95dca78cb.png';
import whitePawn from '/lovable-uploads/603ac683-9337-42af-a43c-da0fb6eaf2cc.png';
import blackKing from '/lovable-uploads/01e605f7-e6ba-47de-ad6e-c45c4ece8d62.png';
import blackQueen from '/lovable-uploads/2a989db7-545c-40ae-9524-dfe3b79f257b.png';
import blackRook from '/lovable-uploads/bac02611-69f0-49e0-a3d1-db3327fa4d68.png';
import blackBishop from '/lovable-uploads/0bcf3ac8-5baa-410b-8981-003472f092e9.png';
import blackKnight from '/lovable-uploads/5bd2d40a-32ae-4598-b85c-ac57354f3dc5.png';
import blackPawn from '/lovable-uploads/4218f425-6783-44ed-b32d-210129365931.png';

// Chess piece image mapping
export const PIECE_IMAGES: Record<string, string> = {
  'wK': whiteKing,
  'wQ': whiteQueen,
  'wR': whiteRook,
  'wB': whiteBishop,
  'wN': whiteKnight,
  'wP': whitePawn,
  'bK': blackKing,
  'bQ': blackQueen,
  'bR': blackRook,
  'bB': blackBishop,
  'bN': blackKnight,
  'bP': blackPawn,
};

// Unicode chess pieces (fallback)
export const PIECE_SYMBOLS: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

export const INITIAL_BOARD: (Piece | null)[][] = [
  [
    { type: 'r', color: 'black' }, { type: 'n', color: 'black' }, { type: 'b', color: 'black' }, { type: 'q', color: 'black' },
    { type: 'k', color: 'black' }, { type: 'b', color: 'black' }, { type: 'n', color: 'black' }, { type: 'r', color: 'black' }
  ],
  [
    { type: 'p', color: 'black' }, { type: 'p', color: 'black' }, { type: 'p', color: 'black' }, { type: 'p', color: 'black' },
    { type: 'p', color: 'black' }, { type: 'p', color: 'black' }, { type: 'p', color: 'black' }, { type: 'p', color: 'black' }
  ],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [
    { type: 'p', color: 'white' }, { type: 'p', color: 'white' }, { type: 'p', color: 'white' }, { type: 'p', color: 'white' },
    { type: 'p', color: 'white' }, { type: 'p', color: 'white' }, { type: 'p', color: 'white' }, { type: 'p', color: 'white' }
  ],
  [
    { type: 'r', color: 'white' }, { type: 'n', color: 'white' }, { type: 'b', color: 'white' }, { type: 'q', color: 'white' },
    { type: 'k', color: 'white' }, { type: 'b', color: 'white' }, { type: 'n', color: 'white' }, { type: 'r', color: 'white' }
  ]
];

export function createInitialGameState(): GameState {
  return {
    board: INITIAL_BOARD.map(row => [...row]),
    currentPlayer: 'white',
    moveHistory: [],
    currentMoveIndex: 0,
    enPassantTarget: null,
    castlingRights: {
      whiteKing: true,
      whiteQueenside: true,
      blackKing: true,
      blackQueenside: true,
    },
    gameOver: false,
    winner: null,
    isReplayMode: false,
  };
}

export function getPieceImage(piece: Piece): string {
  const key = piece.color === 'white' ? `w${piece.type.toUpperCase()}` : `b${piece.type.toUpperCase()}`;
  return PIECE_IMAGES[key] || '';
}

export function getPieceSymbol(piece: Piece): string {
  const key = piece.color === 'white' ? `w${piece.type.toUpperCase()}` : `b${piece.type.toUpperCase()}`;
  return PIECE_SYMBOLS[key] || '';
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function findKing(board: (Piece | null)[][], color: PieceColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'k' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => [...row]);
}

export function applyGravity(board: (Piece | null)[][]): (Piece | null)[][] {
  const newBoard = cloneBoard(board);
  let hasMovement = true;

  while (hasMovement) {
    hasMovement = false;

    // Process all columns for gravity
    for (let col = 0; col < 8; col++) {
      // Handle white pieces falling down to rank 4 (index 4)
      for (let row = 0; row <= 3; row++) {
        const piece = newBoard[row][col];
        if (piece && piece.type !== 'p') {
          // Find the lowest available position for this piece
          let target = row;
          while (target + 1 <= 3 && newBoard[target + 1][col] === null) {
            target++;
          }
          if (target !== row) {
            newBoard[target][col] = piece;
            newBoard[row][col] = null;
            hasMovement = true;
          }
        }
      }

      // Handle black pieces falling up to rank 5 (index 3)
      for (let row = 7; row >= 4; row--) {
        const piece = newBoard[row][col];
        if (piece && piece.type !== 'p') {
          // Find the highest available position for this piece
          let target = row;
          while (target - 1 >= 4 && newBoard[target - 1][col] === null) {
            target--;
          }
          if (target !== row) {
            newBoard[target][col] = piece;
            newBoard[row][col] = null;
            hasMovement = true;
          }
        }
      }
    }
  }

  return newBoard;
}

export function isSquareUnderAttack(
  board: (Piece | null)[][],
  position: Position,
  byColor: PieceColor
): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const moves = getValidMoves(board, { row, col }, piece, null, {
          whiteKing: true,
          whiteQueenside: true,
          blackKing: true,
          blackQueenside: true,
        });
        
        if (moves.some(move => move.to.row === position.row && move.to.col === position.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getValidMoves(
  board: (Piece | null)[][],
  from: Position,
  piece: Piece,
  enPassantTarget: Position | null,
  castlingRights: any
): Move[] {
  const moves: Move[] = [];
  const { row, col } = from;

  switch (piece.type) {
    case 'p':
      addPawnMoves(moves, board, from, piece, enPassantTarget);
      break;
    case 'r':
      addRookMoves(moves, board, from, piece);
      break;
    case 'n':
      addKnightMoves(moves, board, from, piece);
      break;
    case 'b':
      addBishopMoves(moves, board, from, piece);
      break;
    case 'q':
      addQueenMoves(moves, board, from, piece);
      break;
    case 'k':
      addKingMoves(moves, board, from, piece, castlingRights);
      break;
  }

  return moves;
}

function addPawnMoves(
  moves: Move[],
  board: (Piece | null)[][],
  from: Position,
  piece: Piece,
  enPassantTarget: Position | null
) {
  const { row, col } = from;
  const direction = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;

  // Forward moves
  const nextRow = row + direction;
  if (isValidPosition(nextRow, col) && !board[nextRow][col]) {
    moves.push({ from, to: { row: nextRow, col }, piece });
    
    // Two squares forward from starting position
    if (row === startRow && !board[nextRow + direction][col]) {
      moves.push({ from, to: { row: nextRow + direction, col }, piece });
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const newCol = col + dc;
    if (isValidPosition(nextRow, newCol)) {
      const target = board[nextRow][newCol];
      if (target && target.color !== piece.color) {
        moves.push({
          from,
          to: { row: nextRow, col: newCol },
          piece,
          capturedPiece: target
        });
      }
    }
  }

  // En passant
  if (enPassantTarget && enPassantTarget.row === nextRow) {
    if (enPassantTarget.col === col - 1 || enPassantTarget.col === col + 1) {
      moves.push({
        from,
        to: enPassantTarget,
        piece,
        isEnPassant: true,
        capturedPiece: board[row][enPassantTarget.col] || undefined
      });
    }
  }
}

function addRookMoves(moves: Move[], board: (Piece | null)[][], from: Position, piece: Piece) {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  addLineMoves(moves, board, from, piece, directions);
}

function addBishopMoves(moves: Move[], board: (Piece | null)[][], from: Position, piece: Piece) {
  const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  addLineMoves(moves, board, from, piece, directions);
}

function addQueenMoves(moves: Move[], board: (Piece | null)[][], from: Position, piece: Piece) {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  addLineMoves(moves, board, from, piece, directions);
}

function addLineMoves(
  moves: Move[],
  board: (Piece | null)[][],
  from: Position,
  piece: Piece,
  directions: number[][]
) {
  for (const [dr, dc] of directions) {
    for (let i = 1; i < 8; i++) {
      const newRow = from.row + dr * i;
      const newCol = from.col + dc * i;
      
      if (!isValidPosition(newRow, newCol)) break;
      
      const target = board[newRow][newCol];
      if (!target) {
        moves.push({ from, to: { row: newRow, col: newCol }, piece });
      } else {
        if (target.color !== piece.color) {
          moves.push({
            from,
            to: { row: newRow, col: newCol },
            piece,
            capturedPiece: target
          });
        }
        break;
      }
    }
  }
}

function addKnightMoves(moves: Move[], board: (Piece | null)[][], from: Position, piece: Piece) {
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  
  for (const [dr, dc] of knightMoves) {
    const newRow = from.row + dr;
    const newCol = from.col + dc;
    
    if (isValidPosition(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (!target || target.color !== piece.color) {
        moves.push({
          from,
          to: { row: newRow, col: newCol },
          piece,
          capturedPiece: target || undefined
        });
      }
    }
  }
}

function addKingMoves(
  moves: Move[],
  board: (Piece | null)[][],
  from: Position,
  piece: Piece,
  castlingRights: any
) {
  // Regular king moves
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      
      const newRow = from.row + dr;
      const newCol = from.col + dc;
      
      if (isValidPosition(newRow, newCol)) {
        const target = board[newRow][newCol];
        if (!target || target.color !== piece.color) {
          moves.push({
            from,
            to: { row: newRow, col: newCol },
            piece,
            capturedPiece: target || undefined
          });
        }
      }
    }
  }

  // Castling moves
  if (piece.color === 'white' && from.row === 7 && from.col === 4) {
    // White kingside castling
    if (castlingRights.whiteKing && 
        !board[7][5] && !board[7][6] && 
        board[7][7]?.type === 'r' && board[7][7]?.color === 'white') {
      moves.push({
        from,
        to: { row: 7, col: 6 },
        piece,
        isCastling: true
      });
    }
    
    // White queenside castling
    if (castlingRights.whiteQueenside && 
        !board[7][3] && !board[7][2] && !board[7][1] && 
        board[7][0]?.type === 'r' && board[7][0]?.color === 'white') {
      moves.push({
        from,
        to: { row: 7, col: 2 },
        piece,
        isCastling: true
      });
    }
  }

  if (piece.color === 'black' && from.row === 0 && from.col === 4) {
    // Black kingside castling
    if (castlingRights.blackKing && 
        !board[0][5] && !board[0][6] && 
        board[0][7]?.type === 'r' && board[0][7]?.color === 'black') {
      moves.push({
        from,
        to: { row: 0, col: 6 },
        piece,
        isCastling: true
      });
    }
    
    // Black queenside castling
    if (castlingRights.blackQueenside && 
        !board[0][3] && !board[0][2] && !board[0][1] && 
        board[0][0]?.type === 'r' && board[0][0]?.color === 'black') {
      moves.push({
        from,
        to: { row: 0, col: 2 },
        piece,
        isCastling: true
      });
    }
  }
}

// FEN functions
export function boardToFen(gameState: GameState): string {
  const { board, currentPlayer, castlingRights, enPassantTarget } = gameState;
  
  // Board representation
  let fen = '';
  for (let row = 0; row < 8; row++) {
    let emptyCount = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        const pieceChar = piece.type === piece.type.toUpperCase() ? 
          piece.type.toUpperCase() : piece.type.toLowerCase();
        fen += piece.color === 'white' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (row < 7) fen += '/';
  }

  // Active color
  fen += ' ' + (currentPlayer === 'white' ? 'w' : 'b');

  // Castling rights
  fen += ' ';
  let castling = '';
  if (castlingRights.whiteKing) castling += 'K';
  if (castlingRights.whiteQueenside) castling += 'Q';
  if (castlingRights.blackKing) castling += 'k';
  if (castlingRights.blackQueenside) castling += 'q';
  fen += castling || '-';

  // En passant target
  fen += ' ';
  if (enPassantTarget) {
    const file = String.fromCharCode(97 + enPassantTarget.col);
    const rank = 8 - enPassantTarget.row;
    fen += file + rank;
  } else {
    fen += '-';
  }

  // Halfmove and fullmove clocks (simplified)
  fen += ' 0 1';

  return fen;
}

export function fenToBoard(fen: string): FenData {
  const parts = fen.split(' ');
  const boardStr = parts[0];
  const activeColor = parts[1];
  const castling = parts[2];
  const enPassant = parts[3];

  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  let row = 0, col = 0;
  for (const char of boardStr) {
    if (char === '/') {
      row++;
      col = 0;
    } else if (/\d/.test(char)) {
      col += parseInt(char);
    } else {
      const color = char === char.toUpperCase() ? 'white' : 'black';
      const type = char.toLowerCase() as PieceType;
      board[row][col] = { type, color };
      col++;
    }
  }

  const castlingRights = {
    whiteKing: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKing: castling.includes('k'),
    blackQueenside: castling.includes('q'),
  };

  let enPassantTarget: Position | null = null;
  if (enPassant !== '-') {
    const file = enPassant.charCodeAt(0) - 97;
    const rank = 8 - parseInt(enPassant[1]);
    enPassantTarget = { row: rank, col: file };
  }

  return {
    fen,
    board,
    currentPlayer: activeColor === 'w' ? 'white' : 'black',
    castlingRights,
    enPassantTarget,
  };
}
