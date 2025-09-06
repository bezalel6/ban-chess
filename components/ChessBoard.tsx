"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import ChessgroundBoard from "./board/ChessgroundBoard";
import type { Move, Ban, SimpleGameState } from "@/lib/game-types";
import { getCurrentBan } from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";
import { BanChess } from "ban-chess.ts";

/**
 * ChessBoard - Refactored to use the new ChessgroundBoard component
 * 
 * This component now acts as a thin wrapper that:
 * 1. Uses ChessgroundBoard for all visualization and interaction
 * 2. Handles ban-specific logic (banned move alerts)
 * 3. Manages sound effects
 * 
 * All rendering and interaction is delegated to ChessgroundBoard,
 * which uses react-chessground's built-in features.
 */

interface ChessBoardProps {
  gameState: SimpleGameState;
  dests: Map<string, string[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  orientation?: "white" | "black";
  
  // Optional props for different use cases
  viewOnly?: boolean;
  canInteract?: boolean; // Controls whether the user can select and move pieces
  size?: number;
  className?: string;
  banDifficulty?: "easy" | "medium" | "hard";
}

const ChessBoard = memo(function ChessBoard({
  gameState,
  dests,
  activePlayer,
  actionType = "move",
  onMove,
  onBan,
  orientation = "white",
  viewOnly = false,
  canInteract = true, // Default to true for backward compatibility
  size,
  className = "",
  banDifficulty = "medium",
}: ChessBoardProps) {
  const [bannedMoveAlert, setBannedMoveAlert] = useState<boolean>(false);
  
  // Determine which king is in check from the position
  const checkedKing = useMemo(() => {
    if (!gameState?.inCheck || !gameState?.fen) return undefined;
    
    // Create a temporary BanChess instance to analyze the position
    try {
      const tempGame = new BanChess(gameState.fen);
      // The king in check is always the player whose turn it is to move/ban
      // After a check, it's that player's turn to respond
      return tempGame.getActivePlayer();
    } catch {
      // Fallback to activePlayer if FEN parsing fails
      return activePlayer;
    }
  }, [gameState?.inCheck, gameState?.fen, activePlayer]);
  
  // Extract current ban from FEN
  const currentBan = useMemo(() => {
    return gameState ? getCurrentBan(gameState.fen) : null;
  }, [gameState]);
  
  // Delay ban visualization to avoid render issues
  const [visibleBan, setVisibleBan] = useState<typeof currentBan>(null);
  
  useEffect(() => {
    if (currentBan) {
      const timer = setTimeout(() => {
        setVisibleBan(currentBan);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setVisibleBan(null);
    }
  }, [currentBan]);
  
  // Handle move/ban from board
  const handleBoardMove = useCallback(
    (from: string, to: string) => {
      if (!gameState) return;
      
      if (actionType === "ban") {
        onBan({ from, to });
      } else {
        // Check if this move is banned
        if (currentBan && currentBan.from === from && currentBan.to === to) {
          // Show banned move alert
          setBannedMoveAlert(true);
          
          // Play appropriate sound based on difficulty
          if (banDifficulty === 'hard') {
            soundManager.playEvent('ban-attempt-hard');
          } else if (banDifficulty === 'medium') {
            soundManager.playEvent('ban-attempt-medium');
          } else {
            soundManager.playEvent('ban-attempt-easy');
          }
          
          // Reset alert after animation
          setTimeout(() => {
            setBannedMoveAlert(false);
          }, 2000);
          
          return; // Don't process the banned move
        }
        
        // Process the move
        onMove({ from, to });
      }
    },
    [gameState, actionType, currentBan, onMove, onBan, banDifficulty]
  );
  
  // Determine movable color based on game state
  const movableColor = useMemo(() => {
    if (viewOnly) return undefined;
    if (!activePlayer) return undefined;
    if (!canInteract) return undefined; // Disable all piece selection if user can't interact
    
    // In ban mode, can select opponent's pieces
    // In move mode, can select own pieces
    if (actionType === "ban") {
      return "both"; // Can select any piece to see what can be banned
    } else {
      return activePlayer; // Only move own pieces
    }
  }, [viewOnly, activePlayer, actionType, canInteract]);
  
  // Combine dests with banned move for visualization
  const effectiveDests = useMemo(() => {
    const destsMap = new Map(dests);
    
    // Add banned move to destinations if in move phase
    // This makes it appear selectable but we catch it in the handler
    if (actionType === "move" && currentBan && currentBan.from && currentBan.to) {
      const existingDests = destsMap.get(currentBan.from) || [];
      if (!existingDests.includes(currentBan.to)) {
        destsMap.set(currentBan.from, [...existingDests, currentBan.to]);
      }
    }
    
    return destsMap;
  }, [dests, actionType, currentBan]);
  
  // Extract last move from game state
  const lastMove = useMemo((): [string, string] | undefined => {
    if (!gameState?.history || gameState.history.length === 0) {
      return undefined;
    }
    
    const lastEntry = gameState.history[gameState.history.length - 1];
    if (typeof lastEntry === 'string') {
      return undefined; // Can't extract from string format
    }
    
    if (lastEntry.action) {
      const action = lastEntry.action as { move?: Move; ban?: Ban };
      if (action.move) {
        return [action.move.from, action.move.to];
      } else if (action.ban) {
        return [action.ban.from, action.ban.to];
      }
    }
    
    return undefined;
  }, [gameState?.history]);
  
  if (!gameState || !gameState.fen) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chess-board-container">
      <ChessgroundBoard
        fen={gameState.fen}
        orientation={orientation}
        turn={activePlayer}
        check={checkedKing}
        lastMove={lastMove}
        viewOnly={viewOnly}
        movable={{
          color: movableColor,
          dests: effectiveDests,
          showDests: true,
        }}
        bannedMove={visibleBan || undefined}
        onMove={handleBoardMove}
        actionType={actionType}
        size={size}
        className={className}
      />
      
      {/* Banned Move Alert Overlay */}
      {bannedMoveAlert && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
          {banDifficulty === 'hard' ? (
            <div className="bg-red-600/95 text-white px-8 py-4 rounded-xl shadow-2xl animate-shake-alert border-2 border-red-400">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" 
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <span className="font-bold text-xl block">BANNED MOVE!</span>
                  <p className="text-sm opacity-90">This move is not allowed</p>
                </div>
              </div>
            </div>
          ) : banDifficulty === 'medium' ? (
            <div className="bg-orange-500/90 text-white px-6 py-3 rounded-lg shadow-xl animate-pulse border border-orange-300">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <span className="font-semibold">Banned Move</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/80 text-white p-4 rounded-full shadow-lg animate-fade-in">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ChessBoard;