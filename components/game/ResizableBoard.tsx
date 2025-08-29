'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  // Default board size in pixels - use multiples of 8 for perfect square alignment
  const MIN_SIZE = 400;
  const MAX_SIZE = 800;
  const DEFAULT_SIZE = 600;
  const PADDING = 32; // Total padding in chess-board-outer (16px each side)
  
  // Helper to ensure the INNER board (after padding) is divisible by 8
  const roundToGrid = (size: number) => {
    // Calculate what the inner size would be
    const innerSize = size - PADDING;
    // Round inner size to nearest multiple of 8
    const roundedInner = Math.round(innerSize / 8) * 8;
    // Add padding back to get the total size
    return roundedInner + PADDING;
  };
  
  const [boardSize, setBoardSize] = useState(() => {
    // Load saved size from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('boardSize');
      const size = saved ? parseInt(saved, 10) : DEFAULT_SIZE;
      return roundToGrid(size);
    }
    return roundToGrid(DEFAULT_SIZE);
  });

  const [isResizing, setIsResizing] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const startSizeRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Save board size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardSize', boardSize.toString());
    }
  }, [boardSize]);

  const handleResize = useCallback((newSize: number) => {
    // Ensure size is divisible by 8 for perfect square alignment
    const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newSize));
    const gridAlignedSize = roundToGrid(clampedSize);
    setBoardSize(gridAlignedSize);
  }, []);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startSizeRef.current = boardSize;
    startPosRef.current = { x: e.clientX, y: e.clientY };
  }, [boardSize]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate diagonal distance for corner resize
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      // Use the average of X and Y movement for diagonal resize
      const delta = (deltaX + deltaY) / 2;
      const newSize = startSizeRef.current + delta;
      handleResize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleResize]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Board Container with dynamic size and resize handle */}
      <div 
        ref={boardRef}
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
        
        {/* Resize handle - Lichess style corner grip */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize
                     ${isResizing ? 'opacity-100' : 'opacity-60 hover:opacity-100'}
                     transition-opacity`}
          style={{
            background: `linear-gradient(135deg, transparent 40%, rgba(255, 140, 0, 0.5) 40%, rgba(255, 140, 0, 0.5) 60%, transparent 60%),
                        linear-gradient(135deg, transparent 65%, rgba(255, 140, 0, 0.5) 65%, rgba(255, 140, 0, 0.5) 85%, transparent 85%)`
          }}
        >
          {/* Visual indicator */}
          <div className="absolute bottom-1 right-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-lichess-orange-500">
              <path d="M1 11L11 1M6 11L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}