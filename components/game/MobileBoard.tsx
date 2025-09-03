"use client";

import React, { memo } from "react";
import ChessBoard from "../ChessBoard";
import ChessBoardErrorBoundary from "../ChessBoardWrapper";
import type { SimpleGameState, Move, Ban, Square } from "@/lib/game-types";
import { BanChess } from "ban-chess.ts";

interface MobileBoardProps {
  gameState: SimpleGameState;
  game: BanChess | null;
  dests: Map<Square, Square[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  refreshKey?: number;
  orientation?: 'white' | 'black';
}

const MobileBoard = memo(function MobileBoard({
  gameState,
  game,
  dests,
  activePlayer,
  actionType,
  onMove,
  onBan,
  refreshKey,
  orientation = 'white',
}: MobileBoardProps) {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Mobile board container - maximize available space */}
      <div className="w-full" style={{ maxWidth: 'min(100vw - 0.5rem, 600px)' }}>
        {/* Aspect ratio container to maintain square shape */}
        <div className="relative w-full" style={{ paddingBottom: '100%' }}>
          <div className="absolute inset-0 mobile-board-wrapper">
            <ChessBoardErrorBoundary>
              <ChessBoard 
                gameState={gameState} 
                game={game} 
                dests={dests} 
                activePlayer={activePlayer}
                actionType={actionType}
                onMove={onMove} 
                onBan={onBan}
                refreshKey={refreshKey}
                orientation={orientation}
              />
            </ChessBoardErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MobileBoard;