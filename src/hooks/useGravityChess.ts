import { useState, useCallback, useEffect, useMemo } from 'react';
import { GameState, Position, Move, Piece, PieceType, PieceColor } from '@/types/chess';
import { 
  createInitialGameState, 
  getValidMoves, 
  findKing, 
  isSquareUnderAttack, 
  cloneBoard, 
  applyGravity,
  fenToBoard,
  boardToFen
} from '@/utils/chess';
import { toast } from '@/hooks/use-toast';

export function useGravityChess() {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Check for FEN in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const fenParam = urlParams.get('fen');
    
    if (fenParam) {
      try {
        const fenData = fenToBoard(fenParam);
        const boardWithGravity = applyGravity(fenData.board);
        return {
          ...createInitialGameState(),
          board: boardWithGravity,
          currentPlayer: fenData.currentPlayer,
          castlingRights: fenData.castlingRights,
          enPassantTarget: fenData.enPassantTarget,
        };
      } catch (error) {
        console.error('Invalid FEN in URL:', error);
      }
    }
    
    return createInitialGameState();
  });

  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [dangerousMoves, setDangerousMoves] = useState<Position[]>([]);
  const [promotionState, setPromotionState] = useState<{
    isOpen: boolean;
    position: Position | null;
    color: PieceColor;
  }>({
    isOpen: false,
    position: null,
    color: 'white'
  });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Apply gravity with animation
  const applyGravityWithAnimation = useCallback((board: (Piece | null)[][], callback?: () => void) => {
    const processGravity = () => {
      const newBoard = applyGravity(board);
      callback?.();
      return newBoard;
    };

    // Simulate animation delay
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        board: processGravity()
      }));
    }, 200);
  }, []);

  // Check if a move would put own king in check after gravity
  const wouldPutOwnKingInCheck = useCallback((from: Position, to: Position, piece: Piece): boolean => {
    // Create a temporary board with the proposed move
    const tempBoard = cloneBoard(gameState.board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    
    // Apply gravity to see the final state
    const afterGravity = applyGravity(tempBoard);
    
    // Find our king after gravity
    const ourKing = findKing(afterGravity, piece.color);
    if (!ourKing) return true; // If no king found, it's definitely dangerous!
    
    // Check if our king is under attack in this position
    const enemyColor = piece.color === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(afterGravity, ourKing, enemyColor);
  }, [gameState.board]);

  // Validate if a move follows gravity rules
  const validateGravityMove = useCallback((from: Position, to: Position, piece: Piece): boolean => {
    // Pawns can always move (they don't follow gravity)
    if (piece.type === 'p') return true;
    
    // Create a temporary board with the proposed move
    const tempBoard = cloneBoard(gameState.board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    
    // Apply gravity to see the final state
    const afterGravity = applyGravity(tempBoard);
    
    // Find where our piece ended up after gravity
    let finalRow = -1;
    for (let row = 0; row < 8; row++) {
      if (afterGravity[row][to.col] === piece) {
        finalRow = row;
        break;
      }
    }
    
    // The move is valid if:
    // 1. The piece ends up somewhere (didn't disappear)
    // 2. For pieces moving to enemy territory, they must end up supported (not floating)
    if (finalRow === -1) return false;
    
    // If white piece is in black territory (rows 0-3), it must be supported
    if (piece.color === 'white' && finalRow <= 3) {
      // Check if there's support below (another piece or edge of gravity zone)
      return finalRow === 3 || afterGravity[finalRow + 1][to.col] !== null;
    }
    
    // If black piece is in white territory (rows 4-7), it must be supported  
    if (piece.color === 'black' && finalRow >= 4) {
      // Check if there's support above (another piece or edge of gravity zone)
      return finalRow === 4 || afterGravity[finalRow - 1][to.col] !== null;
    }
    
    return true;
  }, [gameState.board]);

  // Handle square clicks
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.gameOver || gameState.isReplayMode) return;

    const clickedPiece = gameState.board[row][col];
    const targetPosition = { row, col };

    // If a square is selected and this is a valid move
    if (selectedSquare && possibleMoves.some(pos => pos.row === row && pos.col === col)) {
      const piece = gameState.board[selectedSquare.row][selectedSquare.col];
      if (!piece) return;

      // Check if this move would put own king in check
      if (wouldPutOwnKingInCheck(selectedSquare, targetPosition, piece)) {
        toast({
          title: "Invalid Move",
          description: "This move would put your own king in check after gravity is applied!",
          variant: "destructive",
        });
        return;
      }

      // Validate gravity before making the move
      if (!validateGravityMove(selectedSquare, targetPosition, piece)) {
        toast({
          title: "Invalid Move",
          description: "This move violates gravity rules. Pieces must not float!",
          variant: "destructive",
        });
        return;
      }

      // Check for pawn promotion
      if (piece.type === 'p' && 
          ((piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7))) {
        setPromotionState({
          isOpen: true,
          position: targetPosition,
          color: piece.color
        });
        return;
      }

      makeMove(selectedSquare, targetPosition);
    } else {
      // Select a piece
      if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        setSelectedSquare(targetPosition);
        const moves = getValidMoves(
          gameState.board,
          targetPosition,
          clickedPiece,
          gameState.enPassantTarget,
          gameState.castlingRights
        );
        // Filter moves by gravity rules
        const validGravityMoves = moves.filter(move => 
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
        setSelectedSquare(null);
        setPossibleMoves([]);
        setDangerousMoves([]);
      }
    }
  }, [gameState, selectedSquare, possibleMoves, validateGravityMove, wouldPutOwnKingInCheck]);

  // Make a move
  const makeMove = useCallback((from: Position, to: Position, promotionPiece?: PieceType) => {
    const piece = gameState.board[from.row][from.col];
    if (!piece) return;

    const newBoard = cloneBoard(gameState.board);
    const capturedPiece = newBoard[to.row][to.col];
    
    // Handle castling
    if (piece.type === 'k' && Math.abs(from.col - to.col) === 2) {
      // King-side castling
      if (to.col === 6) {
        const rook = newBoard[from.row][7];
        newBoard[from.row][5] = rook;
        newBoard[from.row][7] = null;
      }
      // Queen-side castling
      else if (to.col === 2) {
        const rook = newBoard[from.row][0];
        newBoard[from.row][3] = rook;
        newBoard[from.row][0] = null;
      }
    }

    // Handle en passant
    let enPassantCapture = false;
    if (piece.type === 'p' && gameState.enPassantTarget && 
        to.row === gameState.enPassantTarget.row && to.col === gameState.enPassantTarget.col) {
      const captureRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      newBoard[captureRow][to.col] = null;
      enPassantCapture = true;
    }

    // Make the move
    newBoard[to.row][to.col] = promotionPiece ? { ...piece, type: promotionPiece } : piece;
    newBoard[from.row][from.col] = null;

    // Update en passant target
    let newEnPassantTarget: Position | null = null;
    if (piece.type === 'p' && Math.abs(from.row - to.row) === 2) {
      newEnPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
    }

    // Update castling rights
    const newCastlingRights = { ...gameState.castlingRights };
    if (piece.type === 'k') {
      if (piece.color === 'white') {
        newCastlingRights.whiteKing = false;
        newCastlingRights.whiteQueenside = false;
      } else {
        newCastlingRights.blackKing = false;
        newCastlingRights.blackQueenside = false;
      }
    }
    if (piece.type === 'r') {
      if (piece.color === 'white') {
        if (from.row === 7 && from.col === 0) newCastlingRights.whiteQueenside = false;
        if (from.row === 7 && from.col === 7) newCastlingRights.whiteKing = false;
      } else {
        if (from.row === 0 && from.col === 0) newCastlingRights.blackQueenside = false;
        if (from.row === 0 && from.col === 7) newCastlingRights.blackKing = false;
      }
    }

    // Check for game over (king capture)
    const enemyKing = findKing(newBoard, gameState.currentPlayer === 'white' ? 'black' : 'white');
    const gameOver = !enemyKing;

    const move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined,
      isEnPassant: enPassantCapture,
      isCastling: piece.type === 'k' && Math.abs(from.col - to.col) === 2,
      isPromotion: !!promotionPiece,
      promotedTo: promotionPiece
    };

    // Clear current move index if we're in the middle of history
    const newMoveHistory = gameState.currentMoveIndex < gameState.moveHistory.length - 1 
      ? gameState.moveHistory.slice(0, gameState.currentMoveIndex + 1)
      : gameState.moveHistory;

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: gameOver ? prev.currentPlayer : (prev.currentPlayer === 'white' ? 'black' : 'white'),
      moveHistory: [...newMoveHistory, move],
      currentMoveIndex: newMoveHistory.length,
      enPassantTarget: newEnPassantTarget,
      castlingRights: newCastlingRights,
      gameOver,
      winner: gameOver ? prev.currentPlayer : null,
      isReplayMode: false
    }));

    setLastMove({ from, to });
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDangerousMoves([]);

    // Apply gravity after the move
    if (!gameOver) {
      applyGravityWithAnimation(newBoard);
    }

    if (gameOver) {
      toast({
        title: "Game Over!",
        description: `${gameState.currentPlayer === 'white' ? 'White' : 'Black'} wins by capturing the king!`,
      });
    }
  }, [gameState, applyGravityWithAnimation]);

  // Handle promotion
  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (promotionState.position && selectedSquare) {
      makeMove(selectedSquare, promotionState.position, pieceType);
    }
    setPromotionState({ isOpen: false, position: null, color: 'white' });
  }, [promotionState, selectedSquare, makeMove]);

  // Navigation functions
  const goToPreviousMove = useCallback(() => {
    if (gameState.currentMoveIndex > 0) {
      setGameState(prev => ({
        ...prev,
        currentMoveIndex: prev.currentMoveIndex - 1,
        isReplayMode: prev.currentMoveIndex - 1 < prev.moveHistory.length - 1
      }));
    }
  }, [gameState.currentMoveIndex]);

  const goToNextMove = useCallback(() => {
    if (gameState.currentMoveIndex < gameState.moveHistory.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentMoveIndex: prev.currentMoveIndex + 1,
        isReplayMode: prev.currentMoveIndex + 1 < prev.moveHistory.length - 1
      }));
    }
  }, [gameState.currentMoveIndex, gameState.moveHistory.length]);

  // Get current board state (for replay mode)
  const getCurrentBoard = useCallback(() => {
    if (gameState.isReplayMode && gameState.currentMoveIndex >= 0) {
      // Reconstruct board state up to current move
      // Use basePosition if available (from FEN import), otherwise use initial state
      const startingState = gameState.basePosition || {
        board: createInitialGameState().board,
        currentPlayer: 'white',
        castlingRights: createInitialGameState().castlingRights,
        enPassantTarget: null
      };
      
      let board = cloneBoard(startingState.board);
      let currentPlayer: PieceColor = startingState.currentPlayer;
      
      for (let i = 0; i <= gameState.currentMoveIndex; i++) {
        const move = gameState.moveHistory[i];
        if (move) {
          // Apply move
          board[move.to.row][move.to.col] = move.promotedTo ? 
            { ...move.piece, type: move.promotedTo } : move.piece;
          board[move.from.row][move.from.col] = null;
          
          // Apply gravity
          board = applyGravity(board);
          currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        }
      }
      
      return { board, currentPlayer };
    }
    
    return { board: gameState.board, currentPlayer: gameState.currentPlayer };
  }, [gameState]);

  const continueFromCurrentMove = useCallback(() => {
    // Get the current board state from the replay position
    const { board: currentBoard, currentPlayer: replayCurrentPlayer } = getCurrentBoard();
    
    setGameState(prev => ({
      ...prev,
      board: currentBoard,
      currentPlayer: replayCurrentPlayer,
      isReplayMode: false,
      moveHistory: prev.moveHistory.slice(0, prev.currentMoveIndex + 1)
    }));
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDangerousMoves([]);
  }, [getCurrentBoard]);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDangerousMoves([]);
    setLastMove(null);
  }, []);

  const importFromFen = useCallback((fen: string) => {
    try {
      const fenData = fenToBoard(fen);
      const boardWithGravity = applyGravity(fenData.board);
      
      // Create a new game state that preserves the imported position as the base
      const newGameState = {
        ...createInitialGameState(),
        board: boardWithGravity,
        currentPlayer: fenData.currentPlayer,
        castlingRights: fenData.castlingRights,
        enPassantTarget: fenData.enPassantTarget,
        // Store the imported position as the base for move reconstruction
        basePosition: {
          board: boardWithGravity,
          currentPlayer: fenData.currentPlayer,
          castlingRights: fenData.castlingRights,
          enPassantTarget: fenData.enPassantTarget,
        }
      };
      
      setGameState(newGameState);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setDangerousMoves([]);
      setLastMove(null);
    } catch (error) {
      throw new Error('Invalid FEN string');
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextMove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousMove, goToNextMove]);

  const toggleBoardFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const { board: currentBoard, currentPlayer } = getCurrentBoard();

  // Find king in check - check both kings
  const kingInCheck = useMemo(() => {
    // Check white king
    const whiteKing = findKing(currentBoard, 'white');
    if (whiteKing && isSquareUnderAttack(currentBoard, whiteKing, 'black')) {
      return whiteKing;
    }
    
    // Check black king
    const blackKing = findKing(currentBoard, 'black');
    if (blackKing && isSquareUnderAttack(currentBoard, blackKing, 'white')) {
      return blackKing;
    }
    
    return null;
  }, [currentBoard]);

  // Check for checkmate/stalemate
  const gameStatus = useMemo(() => {
    if (gameState.gameOver) {
      return { isGameOver: true, winner: gameState.winner, reason: 'capture' };
    }

    // Get all pieces for current player
    const currentPlayerPieces: { piece: Piece; position: Position }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece && piece.color === gameState.currentPlayer) {
          currentPlayerPieces.push({ piece, position: { row, col } });
        }
      }
    }

    // Check if current player has any valid moves and count dangerous moves
    let hasValidMoves = false;
    let totalPossibleMoves = 0;
    let totalDangerousMoves = 0;
    
    for (const { piece, position } of currentPlayerPieces) {
      const moves = getValidMoves(
        currentBoard,
        position,
        piece,
        gameState.enPassantTarget,
        gameState.castlingRights
      );
      
      // Filter moves by gravity rules
      const gravityValidMoves = moves.filter(move => 
        validateGravityMove(position, move.to, piece)
      );
      
      totalPossibleMoves += gravityValidMoves.length;
      
      // Count dangerous moves (moves that would put own king in check)
      const dangerousMoveCount = gravityValidMoves.filter(move =>
        wouldPutOwnKingInCheck(position, move.to, piece)
      ).length;
      
      totalDangerousMoves += dangerousMoveCount;
      
      // Check for valid (safe) moves
      const safeMoves = gravityValidMoves.filter(move => 
        !wouldPutOwnKingInCheck(position, move.to, piece)
      );
      
      if (safeMoves.length > 0) {
        hasValidMoves = true;
        break;
      }
    }

    // Special case: if all possible moves are dangerous (red), the other player wins
    if (totalPossibleMoves > 0 && totalDangerousMoves === totalPossibleMoves) {
      const winner = gameState.currentPlayer === 'white' ? 'black' : 'white';
      return { isGameOver: true, winner, reason: 'all-moves-dangerous' };
    }

    if (!hasValidMoves) {
      if (kingInCheck) {
        // Checkmate
        const winner = gameState.currentPlayer === 'white' ? 'black' : 'white';
        return { isGameOver: true, winner, reason: 'checkmate' };
      } else {
        // Stalemate
        return { isGameOver: true, winner: null, reason: 'stalemate' };
      }
    }

    return { isGameOver: false, winner: null, reason: null };
  }, [currentBoard, gameState.currentPlayer, gameState.gameOver, gameState.winner, gameState.enPassantTarget, gameState.castlingRights, kingInCheck, validateGravityMove, wouldPutOwnKingInCheck]);

  // Update game state when checkmate/stalemate is detected
  useEffect(() => {
    if (gameStatus.isGameOver && !gameState.gameOver) {
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winner: gameStatus.winner as PieceColor | null
      }));

      if (gameStatus.reason === 'checkmate') {
        toast({
          title: "Checkmate!",
          description: `${gameStatus.winner === 'white' ? 'White' : 'Black'} wins!`,
        });
      } else if (gameStatus.reason === 'stalemate') {
        toast({
          title: "Stalemate!",
          description: "The game ends in a draw - no legal moves available but king is not in check.",
        });
      } else if (gameStatus.reason === 'all-moves-dangerous') {
        toast({
          title: "Game Over!",
          description: `${gameStatus.winner === 'white' ? 'White' : 'Black'} wins! All moves would be illegal for the opponent.`,
        });
      }
    }
  }, [gameStatus, gameState.gameOver]);

  return {
    gameState: {
      ...gameState,
      board: currentBoard,
      currentPlayer: gameState.isReplayMode ? currentPlayer : gameState.currentPlayer
    },
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    promotionState,
    lastMove,
    kingInCheck,
    isFlipped,
    handleSquareClick,
    handlePromotion,
    goToPreviousMove,
    goToNextMove,
    continueFromCurrentMove,
    resetGame,
    importFromFen,
    toggleBoardFlip,
    canNavigateBack: gameState.currentMoveIndex > 0,
    canNavigateForward: gameState.currentMoveIndex < gameState.moveHistory.length - 1
  };
}
