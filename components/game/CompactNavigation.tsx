'use client';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface CompactNavigationProps {
  currentMoveIndex: number | null;
  totalMoves: number;
  isViewingHistory: boolean;
  onNavigate: (index: number) => void;
  onFlipBoard: () => void;
  onReturnToLive?: () => void;
  onToggleAutoFlip?: () => void;
  autoFlipEnabled?: boolean;
  isLocalGame?: boolean;
}

export default function CompactNavigation({
  currentMoveIndex,
  totalMoves,
  isViewingHistory,
  onNavigate,
  onFlipBoard,
  onReturnToLive,
  onToggleAutoFlip,
  autoFlipEnabled,
  isLocalGame,
}: CompactNavigationProps) {
  const currentIndex = currentMoveIndex ?? totalMoves - 1;
  const canGoBack = currentIndex >= 0;
  const canGoForward = currentIndex < totalMoves - 1;
  const isAtLive = currentIndex === totalMoves - 1;

  return (
    <div className="flex items-center justify-between bg-background-tertiary rounded-lg px-2 py-1">
      {/* Left section: Navigation arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate(-1)}
          disabled={currentIndex < 0}
          className={`p-1 rounded hover:bg-background-secondary transition-all ${
            currentIndex >= 0
              ? 'text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/30 cursor-not-allowed'
          }`}
          title="First move"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          className={`p-1 rounded hover:bg-background-secondary transition-all ${
            canGoBack
              ? 'text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/30 cursor-not-allowed'
          }`}
          title="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Center section: Move counter and controls */}
      <div className="flex items-center gap-3">
        {/* Move counter */}
        <div className="text-xs font-medium text-foreground-muted">
          Move {currentIndex < 0 ? '0' : currentIndex + 1} of {totalMoves}
        </div>

        {/* Return to live indicator and button */}
        {isViewingHistory && !isAtLive && onReturnToLive && (
          <button
            onClick={onReturnToLive}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 rounded transition-colors"
            title="Return to current position"
          >
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs text-amber-500 font-medium">Live</span>
          </button>
        )}
      </div>

      {/* Right section: Forward arrows and flip board */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate(Math.min(totalMoves - 1, currentIndex + 1))}
          disabled={!canGoForward}
          className={`p-1 rounded hover:bg-background-secondary transition-all ${
            canGoForward
              ? 'text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/30 cursor-not-allowed'
          }`}
          title="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate(totalMoves - 1)}
          disabled={!canGoForward}
          className={`p-1 rounded hover:bg-background-secondary transition-all ${
            canGoForward
              ? 'text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/30 cursor-not-allowed'
          }`}
          title="Last move"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
        
        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1" />
        
        {/* Flip board button */}
        <button
          onClick={onFlipBoard}
          className="p-1 rounded hover:bg-background-secondary transition-all text-foreground-muted hover:text-foreground group relative"
          title="Flip board"
        >
          <RefreshCw className="w-4 h-4" />
          {/* Auto-flip indicator for local games */}
          {isLocalGame && autoFlipEnabled && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-lichess-orange-500 rounded-full" 
                 title="Auto-flip enabled" />
          )}
        </button>

        {/* Auto-flip toggle for local games */}
        {isLocalGame && onToggleAutoFlip && (
          <button
            onClick={onToggleAutoFlip}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              autoFlipEnabled 
                ? 'bg-lichess-orange-500/20 text-lichess-orange-500 hover:bg-lichess-orange-500/30' 
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
            title={autoFlipEnabled ? "Auto-flip ON (click to disable)" : "Manual flip (click to enable auto)"}
          >
            {autoFlipEnabled ? 'Auto' : 'Manual'}
          </button>
        )}
      </div>
    </div>
  );
}