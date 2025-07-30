import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GameState, Position, Move, Piece, PieceType, PieceColor } from '@/types/chess';
import { 
  createInitialGameState, 
  getValidMoves, 
  findKing, 
  isSquareUnderAttack, 
  cloneBoard, 
  applyGravity
} from '@/utils/chess';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPlayerSessionId } from '@/utils/session';

export function useRealtimeGravityChess(gameId: string) {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [dangerousMoves, setDangerousMoves] = useState<Position[]>([]);
  const [promotionState, setPromotionState] = useState<{
    isOpen: boolean;
    position: Position | null;
    color: PieceColor;
  }>({ isOpen: false, position: null, color: 'white' });
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const playerSessionId = useRef(getPlayerSessionId());

  const updateRemoteGameState = useCallback(async (newState: GameState) => {
    const { error } = await supabase
      .from('game_sessions')
      .update({ 
        game_state: newState as any, 
        current_player: newState.currentPlayer,
        status: newState.gameOver ? 'finished' : 'active',
        winner: newState.winner,
        last_updated_by: playerSessionId.current // Include the session ID of the player who made the move
      })
      .eq('id', gameId);
    
    if (error) {
      console.error("Error updating game state:", error);
      toast({ title: "Error", description: "Could not save your move.", variant: "destructive" });
    }
  }, [gameId]);

  const wouldPutOwnKingInCheck = useCallback((board: (Piece | null)[][], from: Position, to: Position, piece: Piece): boolean => {
    const tempBoard = cloneBoard(board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    const afterGravity = applyGravity(tempBoard);
    const ourKing = findKing(afterGravity, piece.color);
    if (!ourKing) return true;
    const enemyColor = piece.color === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(afterGravity, ourKing, enemyColor);
  }, []);

  const validateGravityMove = useCallback((board: (Piece | null)[][], from: Position, to: Position, piece: Piece): boolean => {
    if (piece.type === 'p') return true;
    const tempBoard = cloneBoard(board);
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
    const afterGravity = applyGravity(tempBoard);
    let finalRow = -1;
    for (let row = 0; row < 8; row++) {
      if (afterGravity[row][to.col] === piece) {
        finalRow = row;
        break;
      }
    }
    if (finalRow === -1) return false;
    if (piece.color === 'white' && finalRow <= 3) {
      return finalRow === 3 || afterGravity[finalRow + 1][to.col] !== null;
    }
    if (piece.color === 'black' && finalRow >= 4) {
      return finalRow === 4 || afterGravity[finalRow - 1][col] !== null;
    }
    return true;
  }, []);

  const makeMove = useCallback((from: Position, to: Position, promotionPiece?: PieceType) => {
    setGameState(prevGameState => {
      const piece = prevGameState.board[from.row][from.col];
      if (!piece) return prevGameState;

      const newBoard = cloneBoard(prevGameState.board);
      const capturedPiece = newBoard[to.row][to.col];
      
      if (piece.type === 'k' && Math.abs(from.col - to.col) === 2) {
        if (to.col === 6) {
          newBoard[from.row][5] = newBoard[from.row][7];
          newBoard[from.row][7] = null;
        } else if (to.col === 2) {
          newBoard[from.row][3] = newBoard[from.row][0];
          newBoard[from.row][0] = null;
        }
      }

      let enPassantCapture = false;
      if (piece.type === 'p' && prevGameState.enPassantTarget && to.row === prevGameState.enPassantTarget.row && to.col === prevGameState.enPassantTarget.col) {
        const captureRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
        newBoard[captureRow][to.col] = null;
        enPassantCapture = true;
      }

      newBoard[to.row][to.col] = promotionPiece ? { ...piece, type: promotionPiece } : piece;
      newBoard[from.row][from.col] = null;

      let newEnPassantTarget: Position | null = null;
      if (piece.type === 'p' && Math.abs(from.row - to.row) === 2) {
        newEnPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
      }

      const newCastlingRights = { ...prevGameState.castlingRights };
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

      const boardAfterMove = applyGravity(newBoard);
      const enemyKing = findKing(boardAfterMove, prevGameState.currentPlayer === 'white' ? 'black' : 'white');
      const gameOver = !enemyKing;

      const move: Move = { from, to, piece, capturedPiece: capturedPiece || undefined, isEnPassant: enPassantCapture, isCastling: piece.type === 'k' && Math.abs(from.col - to.col) === 2, isPromotion: !!promotionPiece, promotedTo: promotionPiece };

      const newState: GameState = {
        ...prevGameState,
        board: boardAfterMove,
        currentPlayer: gameOver ? prevGameState.currentPlayer : (prevGameState.currentPlayer === 'white' ? 'black' : 'white'),
        moveHistory: [...prevGameState.moveHistory, move],
        currentMoveIndex: prevGameState.moveHistory.length,
        enPassantTarget: newEnPassantTarget,
        castlingRights: newCastlingRights,
        gameOver,
        winner: gameOver ? prevGameState.currentPlayer : null,
        isReplayMode: false
      };
      
      updateRemoteGameState(newState);
      return newState;
    });

    setLastMove({ from, to });
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDangerousMoves([]);
  }, [updateRemoteGameState]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.gameOver || gameState.currentPlayer !== playerColor) return;

    const clickedPiece = gameState.board[row][col];
    const targetPosition = { row, col };

    if (selectedSquare && possibleMoves.some(pos => pos.row === row && pos.col === col)) {
      const piece = gameState.board[selectedSquare.row][selectedSquare.col];
      if (!piece) return;

      if (wouldPutOwnKingInCheck(gameState.board, selectedSquare, targetPosition, piece)) {
        toast({ title: "Invalid Move", description: "This move would put your own king in check after gravity!", variant: "destructive" });
        return;
      }
      if (!validateGravityMove(gameState.board, selectedSquare, targetPosition, piece)) {
        toast({ title: "Invalid Move", description: "This move violates gravity rules. Pieces must not float!", variant: "destructive" });
        return;
      }

      if (piece.type === 'p' && ((piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7))) {
        setPromotionState({ isOpen: true, position: targetPosition, color: piece.color });
        return;
      }
      makeMove(selectedSquare, targetPosition);
    } else {
      if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        setSelectedSquare(targetPosition);
        const moves = getValidMoves(gameState.board, targetPosition, clickedPiece, gameState.enPassantTarget, gameState.castlingRights);
        const validGravityMoves = moves.filter(move => validateGravityMove(gameState.board, targetPosition, move.to, clickedPiece));
        
        const safeMoves: Position[] = [];
        const dangerousMovesList: Position[] = [];
        validGravityMoves.forEach(move => {
          if (wouldPutOwnKingInCheck(gameState.board, targetPosition, move.to, clickedPiece)) {
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
  }, [gameState, selectedSquare, possibleMoves, playerColor, makeMove, validateGravityMove, wouldPutOwnKingInCheck]);

  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (promotionState.position && selectedSquare) {
      makeMove(selectedSquare, promotionState.position, pieceType);
    }
    setPromotionState({ isOpen: false, position: null, color: 'white' });
  }, [promotionState, selectedSquare, makeMove]);

  useEffect(() => {
    if (!gameId) {
      setIsLoading(false);
      setError("No game ID provided.");
      return;
    }

    const joinAndSubscribe = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors

      const { data: gameData, error: fetchError } = await supabase.from('game_sessions').select('*').eq('id', gameId).single();

      if (fetchError || !gameData) {
        console.error("Error fetching game data:", fetchError);
        setError("Game not found or could not be loaded.");
        setIsLoading(false);
        return;
      }

      // Ensure game_state is valid before setting
      if (!gameData.game_state) {
        console.error("Fetched game data has no game_state:", gameData);
        setError("Game state is corrupted or missing.");
        setIsLoading(false);
        return;
      }

      let currentPlayerColor: PieceColor | null = null;
      const myId = playerSessionId.current;
      let updatePayload: any = {};

      if (gameData.white_player_id === myId) {
        currentPlayerColor = 'white';
        if (!gameData.white_player_connected) updatePayload.white_player_connected = true;
      } else if (gameData.black_player_id === myId) {
        currentPlayerColor = 'black';
        if (!gameData.black_player_connected) updatePayload.black_player_connected = true;
        updatePayload.status = 'active'; // Set status to active when second player joins
      } else if (!gameData.white_player_id) {
        currentPlayerColor = 'white';
        updatePayload.white_player_id = myId;
        updatePayload.white_player_connected = true;
      } else if (!gameData.black_player_id) {
        currentPlayerColor = 'black';
        updatePayload.black_player_id = myId;
        updatePayload.black_player_connected = true;
        updatePayload.status = 'active'; // Set status to active when second player joins
      }

      setPlayerColor(currentPlayerColor);
      if (currentPlayerColor === 'black') setIsFlipped(true);

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase.from('game_sessions').update(updatePayload).eq('id', gameId);
        if (updateError) {
          console.error("Error updating player connection status:", updateError);
          // Don't block loading if this update fails, but log it.
        }
      }

      setGameState(gameData.game_state as GameState);
      // Set lastMove based on the fetched game state's history
      setLastMove(gameData.game_state.moveHistory[gameData.game_state.moveHistory.length - 1] || null);
      setIsLoading(false);

      const channel = supabase.channel(`game:${gameId}`);
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${gameId}` }, (payload) => {
        // Only update if the change is not from this client's move (using last_updated_by)
        if (payload.new.last_updated_by === playerSessionId.current) {
          return;
        }
        const newGameState = payload.new.game_state as GameState;
        setGameState(newGameState);
        setLastMove(newGameState.moveHistory[newGameState.moveHistory.length - 1] || null);
        // Use the *current* playerColor from the state, not the closure
        if (newGameState.currentPlayer === playerColor && !newGameState.gameOver) {
          toast({ title: "Your Turn!", description: "Your opponent has made their move." });
        }
      }).subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    joinAndSubscribe();
  }, [gameId]); // Removed playerColor from dependencies to prevent unnecessary re-runs

  const kingInCheckMemo = useMemo(() => {
    const whiteKing = findKing(gameState.board, 'white');
    if (whiteKing && isSquareUnderAttack(gameState.board, whiteKing, 'black')) return whiteKing;
    const blackKing = findKing(gameState.board, 'black');
    if (blackKing && isSquareUnderAttack(gameState.board, blackKing, 'white')) return blackKing;
    return null;
  }, [gameState.board]);

  const toggleBoardFlip = useCallback(() => setIsFlipped(prev => !prev), []);

  return {
    gameState,
    selectedSquare,
    possibleMoves,
    dangerousMoves,
    promotionState,
    lastMove,
    kingInCheck: kingInCheckMemo, 
    isFlipped,
    playerColor,
    isLoading,
    error,
    handleSquareClick,
    handlePromotion,
    toggleBoardFlip,
  };
}