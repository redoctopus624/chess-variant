import { useState, useCallback, useMemo } from 'react';
import { GameState, Position, Move, Piece } from '@/types/chess';
import { 
  getValidMoves, 
  isSquareUnderAttack,
  findKing,
  cloneBoard
} from '@/utils/chess';

// Helper function to get piece at position
function getPieceAt(board: (Piece | null)[][], position: Position): Piece | null {
  return board[position.row][position.col];
}

// Helper function to check if a move is valid
function isValidMoveSimple(board: (Piece | null)[][], move: Move): boolean {
  const piece = getPieceAt(board, move.from);
  if (!piece) return false;
  
  const validMoves = getValidMoves(board, move.from, piece, null, {
    whiteKing: true,
    whiteQueenside: true,
    blackKing: true,
    blackQueenside: true,
  });
  
  return validMoves.some(validMove => 
    validMove.to.row === move.to.row && validMove.to.col === move.to.col
  );
}

// Helper function to check if move puts own king in check
function wouldMoveExposeKing(board: (Piece | null)[][], move: Move): boolean {
  const newBoard = cloneBoard(board);
  newBoard[move.to.row][move.to.col] = move.piece;
  newBoard[move.from.row][move.from.col] = null;
  
  const kingPos = findKing(newBoard, move.piece.color);
  if (!kingPos) return false;
  
  const opponentColor = move.piece.color === 'white' ? 'black' : 'white';
  return isSquareUnderAttack(newBoard, kingPos, opponentColor);
}

export function useSimpleGameLogic(
  gameState: GameState,
  playerColor: 'white' | 'black' | null,
  isMyTurn: boolean,
  onMove: (move: Move) => void
) {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);

  // Get possible moves for selected piece
  const possibleMoves = useMemo(() => {
    if (!selectedSquare || !isMyTurn || !playerColor) return [];
    const piece = getPieceAt(gameState.board, selectedSquare);
    if (!piece || piece.color !== playerColor) return [];
    
    const validMoves = getValidMoves(gameState.board, selectedSquare, piece, gameState.enPassantTarget, gameState.castlingRights);
    return validMoves.map(move => move.to);
  }, [gameState.board, gameState.enPassantTarget, gameState.castlingRights, selectedSquare, isMyTurn, playerColor]);

  // Get dangerous moves (moves that would put own king in check)
  const dangerousMoves = useMemo(() => {
    if (!selectedSquare || !isMyTurn || !playerColor) return [];
    const piece = getPieceAt(gameState.board, selectedSquare);
    if (!piece || piece.color !== playerColor) return [];
    
    return possibleMoves.filter(movePos => {
      const move: Move = {
        from: selectedSquare,
        to: movePos,
        piece: piece,
        capturedPiece: getPieceAt(gameState.board, movePos) || undefined
      };
      return wouldMoveExposeKing(gameState.board, move);
    });
  }, [gameState.board, selectedSquare, possibleMoves, isMyTurn, playerColor]);

  // Check if king is in check
  const kingInCheck = useMemo(() => {
    if (!playerColor) return null;
    const kingPos = findKing(gameState.board, playerColor);
    if (!kingPos) return null;
    
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(gameState.board, kingPos, opponentColor) ? kingPos : null;
  }, [gameState.board, playerColor]);

  // Get last move
  const lastMove = useMemo(() => {
    if (gameState.moveHistory.length === 0) return null;
    return gameState.moveHistory[gameState.moveHistory.length - 1];
  }, [gameState.moveHistory]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!isMyTurn || !playerColor) return;

    const clickedPosition: Position = { row, col };
    const clickedPiece = getPieceAt(gameState.board, clickedPosition);

    // If no piece is selected
    if (!selectedSquare) {
      // Only select pieces of the current player's color
      if (clickedPiece && clickedPiece.color === playerColor) {
        setSelectedSquare(clickedPosition);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelectedSquare(null);
      return;
    }

    const selectedPiece = getPieceAt(gameState.board, selectedSquare);
    if (!selectedPiece) {
      setSelectedSquare(null);
      return;
    }

    // If clicking another piece of the same color, select it instead
    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare(clickedPosition);
      return;
    }

    // Try to make a move
    const move: Move = {
      from: selectedSquare,
      to: clickedPosition,
      piece: selectedPiece,
      capturedPiece: clickedPiece || undefined
    };

    if (isValidMoveSimple(gameState.board, move)) {
      // Check if this move would put own king in check
      if (!wouldMoveExposeKing(gameState.board, move)) {
        onMove(move);
        setSelectedSquare(null);
      }
    }
  }, [selectedSquare, gameState.board, gameState.enPassantTarget, gameState.castlingRights, playerColor, isMyTurn, onMove]);

  return {
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    kingInCheck,
    lastMove,
    handleSquareClick
  };
}