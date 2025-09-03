'use client';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex items-center justify-center gap-2 py-1">
      {/* Left arrow pair */}
      <div className="flex items-center gap-0">
        <button
          onClick={() => onNavigate(-1)}
          disabled={currentIndex < 0}
          className={`p-0.5 rounded transition-all ${
            currentIndex >= 0
              ? 'hover:bg-background-tertiary/50 text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/20 cursor-not-allowed'
          }`}
          title="First position (Home)"
        >
          <ChevronFirst className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          className={`p-0.5 rounded transition-all ${
            canGoBack
              ? 'hover:bg-background-tertiary/50 text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/20 cursor-not-allowed'
          }`}
          title="Previous (←)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center: Flip board - minimal with transparent background */}
      <div className="flex items-center gap-2">
        {/* Flip button - just icon with subtle border */}
        <div className="relative">
          <button
            onClick={onFlipBoard}
            className="relative p-1 rounded-full transition-all border border-border/30 hover:border-border/60 hover:bg-background-tertiary/20"
            title={isLocalGame && autoFlipEnabled ? "Flip board (Auto-flip ON)" : "Flip board (F)"}
          >
            {/* Circular recycling icon with two arrows */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 text-foreground-muted"
            >
              <path d="M7.5 7.5h9m0 0l-3-3m3 3l-3 3" />
              <path d="M16.5 16.5h-9m0 0l3 3m-3-3l3-3" />
            </svg>
            
            {/* Auto indicator - very subtle dot */}
            {isLocalGame && autoFlipEnabled && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-foreground-muted/50 rounded-full" />
            )}
          </button>

          {/* Auto-flip toggle - tiny text below for local games */}
          {isLocalGame && onToggleAutoFlip && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAutoFlip();
              }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-foreground-muted/50 hover:text-foreground-muted/70 transition-colors"
              title={autoFlipEnabled ? "Click to disable auto-flip" : "Click to enable auto-flip"}
            >
              {autoFlipEnabled ? 'A' : 'M'}
            </button>
          )}
        </div>

        {/* Move counter - tiny and subtle */}
        <span className="text-[10px] text-foreground-muted/50 select-none">
          {currentIndex < 0 ? '0' : currentIndex + 1}/{totalMoves}
        </span>

        {/* Return to live button when viewing history */}
        {isViewingHistory && !isAtLive && (
          <button
            onClick={onReturnToLive}
            className="p-0.5 bg-amber-600/70 hover:bg-amber-600/90 text-white rounded transition-all"
            title="Return to current position"
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right arrow pair */}
      <div className="flex items-center gap-0">
        <button
          onClick={() => onNavigate(Math.min(totalMoves - 1, currentIndex + 1))}
          disabled={!canGoForward}
          className={`p-0.5 rounded transition-all ${
            canGoForward
              ? 'hover:bg-background-tertiary/50 text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/20 cursor-not-allowed'
          }`}
          title="Next (→)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onNavigate(totalMoves - 1)}
          disabled={!canGoForward}
          className={`p-0.5 rounded transition-all ${
            canGoForward
              ? 'hover:bg-background-tertiary/50 text-foreground-muted hover:text-foreground'
              : 'text-foreground-muted/20 cursor-not-allowed'
          }`}
          title="Last position (End)"
        >
          <ChevronLast className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}