'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChessBoard from '../ChessBoard';
import ChessBoardErrorBoundary from '../ChessBoardWrapper';
import type { SimpleGameState, Move, Ban } from '@/lib/game-types';

interface ResizableBoardProps {
  gameState: SimpleGameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  playerColor?: "white" | "black";
}

export default function ResizableBoard({
  gameState,
  onMove,
  onBan,
  playerColor = "white",
}: ResizableBoardProps) {
  // Default board size in pixels
  const MIN_SIZE = 400;
  const MAX_SIZE = 800;
  const DEFAULT_SIZE = 600;
  
  const [boardSize, setBoardSize] = useState(() => {
    // Load saved size from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('boardSize');
      return saved ? parseInt(saved, 10) : DEFAULT_SIZE;
    }
    return DEFAULT_SIZE;
  });

  // Save board size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardSize', boardSize.toString());
    }
  }, [boardSize]);

  const handleResize = useCallback((newSize: number) => {
    const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newSize));
    setBoardSize(clampedSize);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleResize(parseInt(e.target.value, 10));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === '-') {
      handleResize(boardSize - 10);
    } else if (e.key === 'ArrowRight' || e.key === '+' || e.key === '=') {
      handleResize(boardSize + 10);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Board Container with dynamic size */}
      <div 
        className="relative"
        style={{ 
          width: `${boardSize}px`,
          height: `${boardSize}px`,
        }}
      >
        <ChessBoardErrorBoundary>
          <ChessBoard
            gameState={gameState}
            onMove={onMove}
            onBan={onBan}
            playerColor={playerColor}
          />
        </ChessBoardErrorBoundary>
      </div>

      {/* Resize Controls - Lichess Style */}
      <div className="flex items-center gap-4 bg-background-secondary rounded-lg p-2">
        {/* Decrease Button */}
        <button
          onClick={() => handleResize(boardSize - 50)}
          className="p-1 hover:bg-background-tertiary rounded transition-colors"
          aria-label="Decrease board size"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-foreground-secondary">
            <path d="M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={boardSize}
            onChange={handleSliderChange}
            onKeyDown={handleKeyDown}
            className="w-32 h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-lichess-orange-500
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:hover:bg-lichess-orange-400
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-lichess-orange-500
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:hover:bg-lichess-orange-400
                     [&::-moz-range-thumb]:border-0"
            aria-label="Board size"
          />
        </div>

        {/* Increase Button */}
        <button
          onClick={() => handleResize(boardSize + 50)}
          className="p-1 hover:bg-background-tertiary rounded transition-colors"
          aria-label="Increase board size"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-foreground-secondary">
            <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Size indicator */}
        <span className="text-xs text-foreground-secondary min-w-[3rem] text-center">
          {Math.round((boardSize / MAX_SIZE) * 100)}%
        </span>
      </div>
    </div>
  );
}