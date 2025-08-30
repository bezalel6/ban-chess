'use client';

import React from 'react';
import {
  SkipBackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SkipForwardIcon,
  RotateCcwIcon,
} from 'lucide-react';

interface NavigationControlsProps {
  onStart: () => void;
  onBack: () => void;
  onForward: () => void;
  onEnd: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export default function NavigationControls({
  onStart,
  onBack,
  onForward,
  onEnd,
  canGoBack,
  canGoForward,
}: NavigationControlsProps) {
  return (
    <div className=''>
      <div className='flex items-center justify-center gap-2'>
        {/* Go to start */}
        <button
          onClick={onStart}
          disabled={!canGoBack}
          className='p-3 rounded-lg bg-background-tertiary text-foreground
                   hover:bg-lichess-brown-500/20 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500'
          title='Go to start (Home)'
        >
          <SkipBackIcon className='w-5 h-5' />
        </button>

        {/* Go back one move */}
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className='p-3 rounded-lg bg-background-tertiary text-foreground
                   hover:bg-lichess-brown-500/20 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500'
          title='Previous move (←)'
        >
          <ChevronLeftIcon className='w-5 h-5' />
        </button>

        {/* Go forward one move */}
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className='p-3 rounded-lg bg-background-tertiary text-foreground
                   hover:bg-lichess-brown-500/20 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500'
          title='Next move (→)'
        >
          <ChevronRightIcon className='w-5 h-5' />
        </button>

        {/* Go to end */}
        <button
          onClick={onEnd}
          disabled={!canGoForward}
          className='p-3 rounded-lg bg-background-tertiary text-foreground
                   hover:bg-lichess-brown-500/20 transition-colors
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-lichess-orange-500'
          title='Go to end (End)'
        >
          <SkipForwardIcon className='w-5 h-5' />
        </button>

        {/* Flip board (optional feature) */}
        <div className='ml-4 border-l border-border pl-4'>
          <button
            onClick={() => {
              // This could be connected to flip the board orientation
              console.log('Flip board');
            }}
            className='p-3 rounded-lg bg-background-tertiary text-foreground
                     hover:bg-lichess-brown-500/20 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-lichess-orange-500'
            title='Flip board'
          >
            <RotateCcwIcon className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className='mt-3 text-center text-xs text-foreground-subtle'>
        Use arrow keys to navigate • Home/End for start/end
      </div>
    </div>
  );
}
