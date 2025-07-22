import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieceType, PieceColor } from '@/types/chess';
import { getPieceImage } from '@/utils/chess';

interface PromotionDialogProps {
  isOpen: boolean;
  color: PieceColor;
  onSelect: (pieceType: PieceType) => void;
}

export function PromotionDialog({ isOpen, color, onSelect }: PromotionDialogProps) {
  const promotionPieces: PieceType[] = ['q', 'r', 'b', 'n'];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-gravity-primary">
            Choose Promotion Piece
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 p-6">
          {promotionPieces.map((pieceType) => (
            <button
              key={pieceType}
              onClick={() => onSelect(pieceType)}
              className="aspect-square flex items-center justify-center bg-chess-light hover:bg-chess-possible border-2 border-gravity-primary rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-glow"
            >
              <img
                src={getPieceImage({ type: pieceType, color })}
                alt={`${color} ${pieceType}`}
                className="w-16 h-16 drop-shadow-lg"
                draggable={false}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground pb-4">
          Click on a piece to promote your pawn
        </p>
      </DialogContent>
    </Dialog>
  );
}