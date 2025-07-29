import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Upload, 
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { GameState } from '@/types/chess';
import { boardToFen, fenToBoard } from '@/utils/chess';
import { toast } from '@/hooks/use-toast';

interface GameControlsProps {
  gameState: GameState;
  onPreviousMove: () => void;
  onNextMove: () => void;
  onResetGame: () => void;
  onImportFen: (fen: string) => void;
  onContinueFromCurrent: () => void;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
}

export function GameControls({
  gameState,
  onPreviousMove,
  onNextMove,
  onResetGame,
  onImportFen,
  onContinueFromCurrent,
  canNavigateBack,
  canNavigateForward
}: GameControlsProps) {
  const [fenInput, setFenInput] = useState('');
  const [showFenDialog, setShowFenDialog] = useState(false);

  const handleExportFen = () => {
    const fen = boardToFen(gameState);
    navigator.clipboard.writeText(fen);
    toast({
      title: "FEN Exported",
      description: "FEN string copied to clipboard!",
    });
  };

  const handleImportFen = () => {
    try {
      const fenData = fenToBoard(fenInput);
      onImportFen(fenInput);
      setShowFenDialog(false);
      setFenInput('');
      toast({
        title: "FEN Imported",
        description: "Game state loaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Invalid FEN",
        description: "Please check your FEN string and try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && canNavigateBack) {
      onPreviousMove();
    } else if (e.key === 'ArrowRight' && canNavigateForward) {
      onNextMove();
    }
  };

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Move Navigation */}
      <Card className="bg-card/50 backdrop-blur border-gravity-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="text-gravity-primary">Move Navigation</span>
            <Badge variant="outline" className="text-gravity-primary border-gravity-primary">
              Move {gameState.currentMoveIndex + 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onPreviousMove}
              disabled={!canNavigateBack}
              className="hover:bg-gravity-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 px-4">
              <span className="text-sm text-muted-foreground">Use ← → arrow keys</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={onNextMove}
              disabled={!canNavigateForward}
              className="hover:bg-gravity-primary/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {gameState.isReplayMode && (
            <div className="mt-4 text-center">
              <Button
                onClick={onContinueFromCurrent}
                className="bg-gravity-warning hover:bg-gravity-warning/90 text-black"
              >
                <Play className="h-4 w-4 mr-2" />
                Continue from here
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          onClick={onResetGame}
          variant="outline"
          className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          New Game
        </Button>

        <Dialog open={showFenDialog} onOpenChange={setShowFenDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="hover:bg-gravity-success/10">
              <Upload className="h-4 w-4 mr-2" />
              Import FEN
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import FEN</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a FEN string to load a specific game position:
              </p>
              <Input
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleImportFen} className="flex-1">
                  Import
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFenDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          onClick={handleExportFen}
          variant="outline"
          className="hover:bg-gravity-primary/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Export FEN
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const fen = boardToFen(gameState);
            const url = `${window.location.origin}?fen=${encodeURIComponent(fen)}`;
            navigator.clipboard.writeText(url);
            toast({
              title: "Share Link Copied",
              description: "Share this link to play with others!",
            });
          }}
          className="hover:bg-gravity-secondary/10"
        >
          Share Game
        </Button>
      </div>
    </div>
  );
}