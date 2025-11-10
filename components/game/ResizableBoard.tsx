"use client";

import React, { useState, memo, useEffect } from "react";
import ChessBoard from "../ChessBoard";
import ChessBoardErrorBoundary from "../ChessBoardWrapper";
import type { SimpleGameState, Move, Ban } from "@/lib/game-types";

interface ResizableBoardProps {
  gameState: SimpleGameState;
  dests: Map<string, string[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  refreshKey?: number;
  orientation?: 'white' | 'black';
  canInteract?: boolean;
  banPenalty?: "mild" | "moderate" | "severe";
}

const ResizableBoard = memo(function ResizableBoard({
  gameState,
  dests,
  activePlayer,
  actionType,
  onMove,
  onBan,
  refreshKey: _refreshKey,
  orientation = 'white',
  canInteract = true,
  banPenalty = "moderate",
}: ResizableBoardProps) {
  // Simple responsive sizing based on viewport
  const [boardSize, setBoardSize] = useState(600);

  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 768) {
        setBoardSize(400); // Mobile
      } else if (viewportWidth < 1024) {
        setBoardSize(500); // Tablet
      } else {
        setBoardSize(600); // Desktop
      }
    };

    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative group">
        <ChessBoardErrorBoundary>
          <ChessBoard
            gameState={gameState}
            dests={dests}
            activePlayer={activePlayer}
            actionType={actionType}
            onMove={onMove}
            onBan={onBan}
            orientation={orientation}
            canInteract={canInteract}
            size={boardSize}
            className="shadow-2xl"
            banPenalty={banPenalty}
          />
        </ChessBoardErrorBoundary>
      </div>
    </div>
  );
});

ResizableBoard.displayName = "ResizableBoard";
export default ResizableBoard;