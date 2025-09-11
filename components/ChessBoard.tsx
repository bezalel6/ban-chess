"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import ChessgroundBoard from "./board/ChessgroundBoard";
import type { Move, Ban, SimpleGameState } from "@/lib/game-types";
import { getCurrentBan } from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";

/**
 * ChessBoard - Refactored to use the new ChessgroundBoard component
 *
 * This component now acts as a thin wrapper that:
 * 1. Uses ChessgroundBoard for all visualization and interaction
 * 2. Handles ban-specific logic (banned move alerts, check detection)
 * 3. Manages sound effects
 *
 * Key Ban Chess Logic:
 * - Check Detection: When a player makes a MOVE (not ban) that results in check,
 *   the OTHER player's king is in check. We determine this by finding the last
 *   move action in history and highlighting the opposite player's king.
 * - The FEN's turn field (field 2) does NOT indicate whose king is in check
 * - The FEN's 7th field contains ply number and optional ban, with indicators (+, #, =)
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

  /**
   * Determines which king is in check based on Ban Chess rules.
   * 
   * Important: In Ban Chess, the check indicator in the FEN ('+' at the end) only
   * tells us there IS a check, not WHO is in check. We must look at the game history
   * to determine which player delivered the check.
   * 
   * Logic:
   * 1. Find the last MOVE action (not ban) in the history
   * 2. The player who made that move is the attacker who delivered check
   * 3. The OTHER player's king is the one in check and should be highlighted
   * 
   * Example: If White plays Bb5+ at ply 10, then:
   * - White is the attacker
   * - Black's king is in check
   * - We highlight Black's king
   * 
   * Note: The FEN's turn field (field 2: 'w' or 'b') indicates whose turn it would be
   * in standard chess, NOT whose king is in check or who needs to respond in Ban Chess.
   */
  const checkedKing = useMemo(() => {
    if (!gameState?.inCheck || !gameState?.fen) {
      return undefined;
    }
    
    // Find the last move in history (not ban)
    if (gameState.history && gameState.history.length > 0) {
      // Search backwards for the last move action
      for (let i = gameState.history.length - 1; i >= 0; i--) {
        const entry = gameState.history[i];
        if (entry && typeof entry === 'object' && entry.actionType === 'move') {
          // Found the last move - the player who made it gave check
          const attackingPlayer = entry.player;
          const checkedPlayer = attackingPlayer === 'white' ? 'black' : 'white';
          console.log("[ChessBoard] Check: " + attackingPlayer + " checks " + checkedPlayer + "'s king");
          return checkedPlayer;
        }
      }
    }
    
    // Fallback - shouldn't happen in normal play
    console.log("[ChessBoard] Warning: Could not determine checked king from history");
    return undefined;
  }, [gameState?.inCheck, gameState?.fen, gameState?.history]);

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
          if (banDifficulty === "hard") {
            soundManager.playEvent("ban-attempt-hard");
          } else if (banDifficulty === "medium") {
            soundManager.playEvent("ban-attempt-medium");
          } else {
            soundManager.playEvent("ban-attempt-easy");
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
    if (
      actionType === "move" &&
      currentBan &&
      currentBan.from &&
      currentBan.to
    ) {
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
    if (typeof lastEntry === "string") {
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
    <div className="relative w-full h-full">
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
          {banDifficulty === "hard" ? (
            <div className="bg-red-600/95 text-white px-8 py-4 rounded-xl shadow-2xl animate-shake-alert border-2 border-red-400">
              <div className="flex items-center gap-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <div>
                  <span className="font-bold text-xl block">BANNED MOVE!</span>
                  <p className="text-sm opacity-90">This move is not allowed</p>
                </div>
              </div>
            </div>
          ) : banDifficulty === "medium" ? (
            /* Yellow road warning sign style - diamond shape */
            <div
              className="relative animate-warning-bounce"
              style={{
                width: "160px",
                height: "160px",
                transform: "rotate(45deg)",
              }}
            >
              {/* Outer black border */}
              <div
                className="absolute inset-0 bg-black"
                style={{
                  borderRadius: "12px",
                }}
              />
              {/* Inner yellow diamond */}
              <div
                className="absolute inset-[4px] bg-yellow-400 flex items-center justify-center"
                style={{
                  borderRadius: "8px",
                }}
              >
                {/* Content container - rotate back to normal */}
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    transform: "rotate(-45deg)",
                  }}
                >
                  {/* Warning icon */}
                  <svg
                    className="w-16 h-16 text-black mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                  {/* Text */}
                  <span className="text-black font-black text-sm uppercase tracking-wide">
                    Banned
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/80 text-white p-4 rounded-full shadow-lg animate-fade-in">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ChessBoard;
