import { useState, useCallback, useMemo } from 'react';
import { Position, Piece, GameState, Move } from '@/types/chess';
import { 
  getValidMoves,
  findKing,
  isSquareUnderAttack,
  cloneBoard,
  applyGravity,
  isValidPosition
} from '@/utils/chess';

export function useMultiplayerGameLogic(gameState: GameState, playerColor: 'white' | 'black') {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [dangerousMoves, setDangerousMoves] = useState<Position[]>([]);

  // Check if a move would put own king in check after gravity
  const wouldPutOwnKingInCheck = useCallback((from: Position, to: Position, piece: Piece): boolean => {
    // Create a temporary board with the proposed move
    const tempBoard = cloneBoard(gameState.board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    
    // Apply gravity to see the final state
    const boardAfterGravity = applyGravity(tempBoard);
    
    // Check if the king is under attack after gravity
    const kingPosition = findKing(boardAfterGravity, playerColor);
    if (!kingPosition) return true; // If no king found, something is wrong
    
    const enemyColor = playerColor === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(boardAfterGravity, kingPosition, enemyColor);
  }, [gameState.board, playerColor]);

  // Validate gravity move (similar to single player logic)
  const validateGravityMove = useCallback((from: Position, to: Position, piece: Piece): boolean => {
    if (!isValidPosition(to.row, to.col)) return false;
    
    // Get basic piece moves
    const basicMoves = getValidMoves(gameState.board, from, piece, gameState.enPassantTarget, gameState.castlingRights);
    
    // Check if the target position is a valid basic move
    const isBasicMoveValid = basicMoves.some(move => move.to.row === to.row && move.to.col === to.col);
    if (!isBasicMoveValid) return false;
    
    // Apply gravity and check if move is still valid
    const tempBoard = cloneBoard(gameState.board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    const boardAfterGravity = applyGravity(tempBoard);
    
    // Move is valid if piece ends up in a valid position after gravity
    return boardAfterGravity[to.row][to.col] === piece || 
           (piece.type === 'p' && to.row >= 4 && boardAfterGravity[4][to.col] === piece) ||
           (piece.type === 'p' && to.row <= 3 && boardAfterGravity[3][to.col] === piece);
  }, [gameState.board, gameState.enPassantTarget, gameState.castlingRights]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    const clickedPiece = gameState.board[row][col];
    const targetPosition = { row, col };

    // Clear selection on invalid click
    if (row < 0 || col < 0) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      setDangerousMoves([]);
      return { isMove: false, move: null };
    }

    // If we have a selected square and clicked on a valid move target
    if (selectedSquare && possibleMoves.some(pos => pos.row === row && pos.col === col)) {
      const piece = gameState.board[selectedSquare.row][selectedSquare.col];
      
      if (piece) {
        const move = {
          from: selectedSquare,
          to: targetPosition,
          piece,
          capturedPiece: clickedPiece || undefined
        };

        // Clear selection
        setSelectedSquare(null);
        setPossibleMoves([]);
        setDangerousMoves([]);
        
        return { isMove: true, move };
      }
    }

    // Select piece if it belongs to the current player and it's their turn
    if (clickedPiece && clickedPiece.color === playerColor && gameState.currentPlayer === playerColor) {
      setSelectedSquare(targetPosition);
      
      // Get basic moves for the piece
      const basicMoves = getValidMoves(gameState.board, targetPosition, clickedPiece, gameState.enPassantTarget, gameState.castlingRights);
      
      // Filter moves that are valid after gravity
      const validGravityMoves = basicMoves.filter(move => 
        validateGravityMove(targetPosition, move.to, clickedPiece)
      );
      
      // Separate safe moves from dangerous moves
      const safeMoves: Position[] = [];
      const dangerousMovesList: Position[] = [];
      
      validGravityMoves.forEach(move => {
        if (wouldPutOwnKingInCheck(targetPosition, move.to, clickedPiece)) {
          dangerousMovesList.push(move.to);
        } else {
          safeMoves.push(move.to);
        }
      });
      
      setPossibleMoves(safeMoves);
      setDangerousMoves(dangerousMovesList);
    } else {
      // Clear selection if clicking on empty square or opponent's piece
      setSelectedSquare(null);
      setPossibleMoves([]);
      setDangerousMoves([]);
    }

    return { isMove: false, move: null };
  }, [gameState.board, gameState.enPassantTarget, gameState.castlingRights, gameState.currentPlayer, selectedSquare, possibleMoves, playerColor, validateGravityMove, wouldPutOwnKingInCheck]);

  // Check if king is in check
  const kingInCheck = useMemo(() => {
    const kingPosition = findKing(gameState.board, playerColor);
    if (!kingPosition) return null;
    
    const enemyColor = playerColor === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(gameState.board, kingPosition, enemyColor) ? kingPosition : null;
  }, [gameState.board, playerColor]);

  // Get last move from game state
  const lastMove = gameState.moveHistory.length > 0 
    ? gameState.moveHistory[gameState.moveHistory.length - 1] 
    : null;

  return {
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    kingInCheck,
    lastMove,
    handleSquareClick
  };
}