import React, { useState, useCallback, useRef } from 'react';
import { Piece, Position } from '@/types/chess';
import { getPieceImage } from '@/utils/chess';
import { cn } from '@/lib/utils';


interface ChessBoardProps {
  board: (Piece | null)[][];
  selectedSquare: Position | null;
  possibleMoves: Position[];
  dangerousMoves: Position[];
  onSquareClick: (row: number, col: number) => void;
  kingInCheck: Position | null;
  lastMove: { from: Position; to: Position } | null;
  isReplayMode: boolean;
  isFlipped?: boolean;
}

export function ChessBoard({
  board,
  selectedSquare,
  possibleMoves,
  dangerousMoves,
  onSquareClick,
  kingInCheck,
  lastMove,
  isReplayMode,
  isFlipped = false
}: ChessBoardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const isSquareSelected = (row: number, col: number) => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };

  const isSquarePossibleMove = (row: number, col: number) => {
    return possibleMoves.some(move => move.row === row && move.col === col);
  };

  const isSquareDangerousMove = (row: number, col: number) => {
    return dangerousMoves.some(move => move.row === row && move.col === col);
  };

  const isSquareInCheck = (row: number, col: number) => {
    return kingInCheck?.row === row && kingInCheck?.col === col;
  };

  const isSquareLastMove = (row: number, col: number) => {
    return (lastMove?.from.row === row && lastMove?.from.col === col) ||
           (lastMove?.to.row === row && lastMove?.to.col === col);
  };

  const isGravityZoneBoundary = (row: number) => {
    // For white pieces (bottom of board): gravity zone is between ranks 4 and 5 (row 3)
    // For black pieces (top of board): gravity zone is between ranks 5 and 6 (row 4)
    // We need to determine which boundary to show based on the current turn or perspective
    if (isFlipped) {
      return row === 4; // When flipped (black perspective), show boundary at row 4
    }
    return row === 3; // When not flipped (white perspective), show boundary at row 3
  };

  // Create display board that can be flipped
  const displayBoard = isFlipped ? [...board].reverse().map(row => [...row].reverse()) : board;

  // Convert display coordinates to actual board coordinates
  const getActualCoordinates = (displayRow: number, displayCol: number) => {
    if (isFlipped) {
      return {
        row: 7 - displayRow,
        col: 7 - displayCol
      };
    }
    return { row: displayRow, col: displayCol };
  };

  // Convert actual coordinates to display coordinates for highlighting
  const getDisplayCoordinates = (actualRow: number, actualCol: number) => {
    if (isFlipped) {
      return {
        row: 7 - actualRow,
        col: 7 - actualCol
      };
    }
    return { row: actualRow, col: actualCol };
  };

  // Get square position from mouse event
  const getSquareFromEvent = useCallback((event: React.MouseEvent) => {
    if (!boardRef.current) return null;
    
    const rect = boardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const squareSize = rect.width / 8;
    const displayCol = Math.floor(x / squareSize);
    const displayRow = Math.floor(y / squareSize);
    
    if (displayRow >= 0 && displayRow < 8 && displayCol >= 0 && displayCol < 8) {
      return getActualCoordinates(displayRow, displayCol);
    }
    return null;
  }, [isFlipped]);

  // Handle left mouse down for piece dragging
  const handleLeftMouseDown = useCallback((event: React.MouseEvent) => {
    if (isReplayMode) return;
    
    const square = getSquareFromEvent(event);
    if (square) {
      const piece = board[square.row][square.col];
      
      if (piece) {
        setIsDragging(true);
        setDragStart(square);
        setDraggedPiece(piece);
        setMousePosition({ x: event.clientX, y: event.clientY });
        onSquareClick(square.row, square.col);
      }
    }
  }, [getSquareFromEvent, isReplayMode, board, onSquareClick]);

  // Handle left mouse up for piece dropping
  const handleLeftMouseUp = useCallback((event: React.MouseEvent) => {
    const square = getSquareFromEvent(event);
    
    // If we were dragging, handle the drop
    if (isDragging && dragStart && square) {
      onSquareClick(square.row, square.col);
    }
    // If we weren't dragging, this is a simple click
    else if (!isDragging && square) {
      onSquareClick(square.row, square.col);
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDraggedPiece(null);
    setMousePosition(null);
  }, [isDragging, dragStart, getSquareFromEvent, onSquareClick]);


  // Handle mouse move while dragging piece
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging]);


  // Handle mouse down to determine if left click
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // Left click
      handleLeftMouseDown(event);
    }
  }, [handleLeftMouseDown]);

  // Handle mouse up for left click
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // Left click
      handleLeftMouseUp(event);
    }
  }, [handleLeftMouseUp]);

  // Handle right click
  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);


  return (
    <div className="relative">
      {/* Gravity zone indicator */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div 
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gravity-primary to-transparent opacity-60"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gravity-primary font-bold">
          GRAVITY
        </div>
      </div>

      <div 
        ref={boardRef}
        className="grid grid-cols-8 gap-0 border-2 border-gravity-primary rounded-lg overflow-hidden shadow-gravity bg-gradient-board relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleRightClick}
      >
        {displayBoard.map((row, displayRowIndex) =>
          row.map((piece, displayColIndex) => {
            const actualCoords = getActualCoordinates(displayRowIndex, displayColIndex);
            const isLight = (displayRowIndex + displayColIndex) % 2 === 0;
            
            // Check highlights using actual coordinates
            const isSelected = selectedSquare && 
              getDisplayCoordinates(selectedSquare.row, selectedSquare.col).row === displayRowIndex &&
              getDisplayCoordinates(selectedSquare.row, selectedSquare.col).col === displayColIndex;
            
            const isPossibleMove = possibleMoves.some(move => {
              const displayPos = getDisplayCoordinates(move.row, move.col);
              return displayPos.row === displayRowIndex && displayPos.col === displayColIndex;
            });

            const isDangerousMove = dangerousMoves.some(move => {
              const displayPos = getDisplayCoordinates(move.row, move.col);
              return displayPos.row === displayRowIndex && displayPos.col === displayColIndex;
            });
            
            const inCheck = kingInCheck && 
              getDisplayCoordinates(kingInCheck.row, kingInCheck.col).row === displayRowIndex &&
              getDisplayCoordinates(kingInCheck.row, kingInCheck.col).col === displayColIndex;
            
            const isLastMoveSquare = lastMove && (
              (getDisplayCoordinates(lastMove.from.row, lastMove.from.col).row === displayRowIndex &&
               getDisplayCoordinates(lastMove.from.row, lastMove.from.col).col === displayColIndex) ||
              (getDisplayCoordinates(lastMove.to.row, lastMove.to.col).row === displayRowIndex &&
               getDisplayCoordinates(lastMove.to.row, lastMove.to.col).col === displayColIndex)
            );
            
            const isGravityBoundary = isGravityZoneBoundary(actualCoords.row);

            return (
              <div
                key={`${displayRowIndex}-${displayColIndex}`}
                className={cn(
                  "aspect-square flex items-center justify-center cursor-pointer relative transition-all duration-200 text-4xl font-bold select-none",
                  isLight ? "bg-chess-light" : "bg-chess-dark",
                  isSelected && "bg-chess-selected shadow-glow",
                  isPossibleMove && "bg-chess-possible border-2 border-gravity-success",
                  isDangerousMove && "bg-red-500/80 border-2 border-red-600",
                  inCheck && "bg-chess-check animate-piece-glow",
                  isLastMoveSquare && "ring-2 ring-gravity-warning ring-opacity-60",
                  isGravityBoundary && "border-b-2 border-gravity-primary border-opacity-50",
                  isReplayMode && "cursor-not-allowed opacity-80",
                  !isReplayMode && "hover:brightness-110"
                )}
              >
                {piece && !(isDragging && dragStart && dragStart.row === actualCoords.row && dragStart.col === actualCoords.col) && (
                  <img
                    src={getPieceImage(piece)}
                    alt={`${piece.color} ${piece.type}`}
                    className={cn(
                      "w-12 h-12 transition-all duration-300 hover:scale-110 drop-shadow-lg",
                      (isPossibleMove || isDangerousMove) && "animate-float"
                    )}
                    draggable={false}
                  />
                )}
                
                {isPossibleMove && !piece && (
                  <div className="w-4 h-4 rounded-full bg-gravity-success opacity-60" />
                )}

                {isDangerousMove && !piece && (
                  <div className="w-4 h-4 rounded-full bg-red-600 opacity-80" />
                )}

                {/* Coordinate labels */}
                {displayColIndex === 0 && (
                  <div className="absolute left-1 top-1 text-xs text-black font-semibold">
                    {isFlipped ? displayRowIndex + 1 : 8 - displayRowIndex}
                  </div>
                )}
                {displayRowIndex === 7 && (
                  <div className="absolute right-1 bottom-1 text-xs text-black font-semibold">
                    {String.fromCharCode(97 + (isFlipped ? 7 - displayColIndex : displayColIndex))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Dragged piece overlay */}
        {isDragging && draggedPiece && mousePosition && (
          <div 
            className="fixed pointer-events-none z-50"
            style={{
              left: mousePosition.x - 24, // Always center the piece on cursor
              top: mousePosition.y - 24,
            }}
          >
            <img
              src={getPieceImage(draggedPiece)}
              alt={`${draggedPiece.color} ${draggedPiece.type}`}
              className="w-12 h-12 opacity-80 scale-110 drop-shadow-2xl animate-pulse"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
