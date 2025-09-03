'use client';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface NavigationBarProps {
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

export default function NavigationBar({
  currentMoveIndex,
  totalMoves,
  isViewingHistory,
  onNavigate,
  onFlipBoard,
  onReturnToLive,
  onToggleAutoFlip,
  autoFlipEnabled,
  isLocalGame,
}: NavigationBarProps) {
  const currentIndex = currentMoveIndex ?? totalMoves - 1;
  const canGoBack = currentIndex >= 0; // Can go back from move 0 to starting position (-1)
  const canGoForward = currentIndex < totalMoves - 1;
  const isAtLive = currentIndex === totalMoves - 1;

  return (
    <div className="flex items-center justify-center gap-1 px-3 py-2 bg-background-secondary rounded-lg border border-border">
      {/* First move */}
      <button
        onClick={() => onNavigate(-1)} // Navigate to starting position
        disabled={currentIndex < 0} // Disabled if already at starting position
        className={`p-1.5 rounded transition-colors ${
          currentIndex >= 0
            ? 'hover:bg-background-tertiary text-foreground'
            : 'text-foreground-muted opacity-50 cursor-not-allowed'
        }`}
        title="Starting position"
      >
        <ChevronFirst className="w-5 h-5" />
      </button>

      {/* Previous move */}
      <button
        onClick={() => onNavigate(currentIndex - 1)}
        disabled={!canGoBack}
        className={`p-1.5 rounded transition-colors ${
          canGoBack
            ? 'hover:bg-background-tertiary text-foreground'
            : 'text-foreground-muted opacity-50 cursor-not-allowed'
        }`}
        title="Previous move"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Move counter / Return to live */}
      <div className="mx-2 min-w-[100px] text-center">
        {isViewingHistory && !isAtLive ? (
          <button
            onClick={onReturnToLive}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors flex items-center gap-1"
            title="Return to current position"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Live</span>
          </button>
        ) : (
          <span className="text-sm text-foreground-muted">
            {currentIndex < 0 ? 'Start' : `${currentIndex + 1} / ${totalMoves}`}
          </span>
        )}
      </div>

      {/* Next move */}
      <button
        onClick={() => onNavigate(Math.min(totalMoves - 1, currentIndex + 1))}
        disabled={!canGoForward}
        className={`p-1.5 rounded transition-colors ${
          canGoForward
            ? 'hover:bg-background-tertiary text-foreground'
            : 'text-foreground-muted opacity-50 cursor-not-allowed'
        }`}
        title="Next move"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Last move */}
      <button
        onClick={() => onNavigate(totalMoves - 1)}
        disabled={!canGoForward}
        className={`p-1.5 rounded transition-colors ${
          canGoForward
            ? 'hover:bg-background-tertiary text-foreground'
            : 'text-foreground-muted opacity-50 cursor-not-allowed'
        }`}
        title="Last move"
      >
        <ChevronLast className="w-5 h-5" />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-2" />

      {/* Flip board */}
      <button
        onClick={onFlipBoard}
        className="p-1.5 rounded hover:bg-background-tertiary text-foreground transition-colors"
        title="Flip board"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
        >
          <path d="M7 16V4m0 0L3 8m4-4l4 4m6-4v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </button>

      {/* Auto-flip toggle for local games */}
      {isLocalGame && onToggleAutoFlip && (
        <>
          <div className="w-px h-6 bg-border mx-2" />
          <button
            onClick={onToggleAutoFlip}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              autoFlipEnabled 
                ? 'bg-lichess-orange-500 text-white hover:bg-lichess-orange-600' 
                : 'bg-background-tertiary text-foreground-muted hover:bg-background-secondary'
            }`}
            title={autoFlipEnabled ? "Auto-flip enabled (click to disable)" : "Auto-flip disabled (click to enable)"}
          >
            {autoFlipEnabled ? 'Auto' : 'Manual'}
          </button>
        </>
      )}
    </div>
  );
}