"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import type {
  Dests,
  Key,
  ReactChessGroundProps,
} from "@bezalel6/react-chessground";
import type { Ban, Move, SimpleGameState, Square } from "@/lib/game-types";
import { getCurrentBan, parseFEN } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { BanChess } from "ban-chess.ts";
import soundManager from "@/lib/sound-manager";

interface ChessBoardProps {
  gameState: SimpleGameState;
  game: BanChess | null;
  dests: Map<Square, Square[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  refreshKey?: number;
  orientation?: "white" | "black";
}

// Helper function to get piece at a square from FEN position
function getPieceAt(fen: string, square: string): string | null {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.

  const rows = fen.split("/");
  const row = rows[rank];

  let col = 0;
  for (const char of row) {
    if (/\d/.test(char)) {
      col += parseInt(char);
    } else {
      if (col === file) {
        return char;
      }
      col++;
    }
  }
  return null;
}

const ChessBoard = memo(function ChessBoard({
  gameState,
  game,
  dests: propDests,
  activePlayer,
  actionType,
  onMove,
  onBan,
  refreshKey = 0,
  orientation: propOrientation,
}: ChessBoardProps) {
  // Get user role from context (already memoized)
  const { role, orientation: contextOrientation, banDifficulty } = useUserRole();

  // Use prop orientation if provided, otherwise use context
  const orientation = propOrientation || contextOrientation;

  // Get game state from BanChess instance
  const currentActivePlayer =
    activePlayer || game?.getActivePlayer() || "white";
  const currentAction = actionType || game?.getActionType() || "move";

  // Determine permissions based on BanChess state
  const isPlayer = role !== null;
  const isMyTurn =
    isPlayer && role === currentActivePlayer && !gameState?.gameOver;
  const canMove = isMyTurn && currentAction === "move";
  const canBan = isMyTurn && currentAction === "ban";
  const [_promotionMove, _setPromotionMove] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Parse FEN data
  const fenData = useMemo(() => {
    if (!gameState?.fen) return null;
    return parseFEN(gameState.fen);
  }, [gameState?.fen]);

  // Determine which color pieces can be moved
  const movableColor = useMemo(() => {
    if (!canMove && !canBan) {
      return undefined;
    }
    if (role === null) {
      return undefined;
    }

    // When the player is allowed to take an action (either ban or move),
    // always allow selecting both colors. The dests map from the server
    // contains the correct legal destinations and will restrict accordingly.
    // This ensures consistent behavior across all game states.
    if (canBan || canMove) {
      return "both";
    } else {
      // Not your turn - no pieces selectable
      return undefined;
    }
  }, [canMove, canBan, role]);

  // Extract values - ban from FEN, action from context
  const currentBan = gameState ? getCurrentBan(gameState.fen) : null;
  const nextAction = currentAction; // From GameRoleContext which gets it from BanChess
  const isInCheck = gameState?.inCheck || game?.inCheck() || false;
  // Delay ban visualization to avoid NaN errors when board is not ready
  const [visibleBan, setVisibleBan] = useState<typeof currentBan>(null);

  useEffect(() => {
    // Small delay to ensure board DOM elements are positioned
    if (currentBan) {
      const timer = setTimeout(() => {
        setVisibleBan(currentBan);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setVisibleBan(null);
    }
  }, [currentBan]);

  // Convert dests from Map<Square, Square[]> to Map<Key, Key[]> for chessground
  const dests: Dests = useMemo(() => {
    const destsMap = new Map<Key, Key[]>();

    // ONLY use provided dests - no fallbacks
    propDests.forEach((squares, from) => {
      destsMap.set(from as Key, squares as Key[]);
    });

    // Add the banned move to destinations if we're in move phase and there's a banned move
    // This makes the banned move appear as a valid destination, but we'll catch it in the handler
    if (canMove && currentBan && currentBan.from && currentBan.to) {
      const fromKey = currentBan.from as Key;
      const toKey = currentBan.to as Key;
      
      // Get existing destinations for this square or create new array
      const existingDests = destsMap.get(fromKey) || [];
      
      // Add the banned destination if it's not already there
      if (!existingDests.includes(toKey)) {
        destsMap.set(fromKey, [...existingDests, toKey]);
      }
    }

    return destsMap;
  }, [propDests, canMove, currentBan]);

  // State for banned move alert
  const [bannedMoveAlert, setBannedMoveAlert] = useState<boolean>(false);

  // Memoize the move handler
  const handleAfterMove = useCallback(
    (orig: string, dest: string) => {
      if (!gameState || !fenData) return;

      if (nextAction === "ban") {
        onBan({ from: orig, to: dest });
      } else {
        // Check if this move is banned
        if (currentBan && currentBan.from === orig && currentBan.to === dest) {
          // This is a banned move! Show alert based on difficulty
          setBannedMoveAlert(true);
          
          // Different feedback based on difficulty level
          // Use sound manager events instead of direct audio
          if (banDifficulty === 'hard') {
            // Hard mode: Play aggressive futuristic explosion sound (not for the faint of heart!)
            soundManager.playEvent('ban-attempt-hard');
          } else if (banDifficulty === 'medium') {
            // Medium mode: Play a subtle error/buzz sound
            soundManager.playEvent('ban-attempt-medium');
          } else if (banDifficulty === 'easy') {
            // Easy mode: No sound event (visual feedback only)
            soundManager.playEvent('ban-attempt-easy');
          }
          
          // Reset the alert after animation
          setTimeout(() => {
            setBannedMoveAlert(false);
          }, 2000);
          
          // Don't process the move
          return false;
        }
        
        // Check if this is a pawn promotion
        const piece = getPieceAt(fenData.position, orig);
        const isPromotion = piece === "P" || piece === "p";
        const destRank = dest[1];

        if (isPromotion && (destRank === "8" || destRank === "1")) {
          // Store the move and show promotion dialog
          _setPromotionMove({ from: orig, to: dest });
        } else {
          onMove({
            from: orig,
            to: dest,
            promotion: undefined,
          });
        }
      }
      return true;
    },
    [gameState, fenData, nextAction, onMove, onBan, currentBan, banDifficulty]
  );

  // Board key that incorporates external refresh trigger
  const boardKey = useMemo(() => `board-${refreshKey}`, [refreshKey]);

  // Memoize config early to comply with Rules of Hooks
  const config = useMemo<ReactChessGroundProps>(
    () => ({
      fen:
        gameState?.fen ||
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      orientation,
      coordinates: false,
      autoCastle: true,
      disableContextMenu: true,
      highlight: {
        lastMove: true,
      },
      check: isInCheck ? fenData?.turn : undefined,
      lastMove: undefined,
      animation: {
        enabled: true,
        duration: 100,
      },
      movable: {
        free: false,
        color: movableColor,
        dests: canMove || canBan ? dests : new Map(),
        showDests: true,
        rookCastle: true, // Disable castling during ban phase
        events: {
          after: handleAfterMove,
        },
      },
      selectable: {
        enabled: canMove || canBan,
      },
      drawable: {
        enabled: true,
        visible: true,
        defaultBrush: canBan && !canMove ? "red" : "green", // Red brush during ban mode
        brushes: {
          green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
          red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
          blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
          yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
        },
        autoShapes:
          visibleBan && visibleBan.from && visibleBan.to
            ? [
                {
                  orig: visibleBan.from as Key,
                  dest: visibleBan.to as Key,
                  brush: "red",
                },
              ]
            : [],
      },
    }),
    [
      gameState?.fen,
      fenData,
      orientation,
      isInCheck,
      movableColor,
      canMove,
      canBan,
      dests,
      handleAfterMove,
      visibleBan,
    ]
  );

  // Safety check: If gameState or fenData is invalid, return a placeholder
  if (!gameState || !gameState.fen || !fenData) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner">
          {/* Maintain square aspect ratio with absolute positioning */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }
  // Apply red theme CSS variables when in ban mode
  const boardStyle = canBan && !canMove ? {
    '--cg-move-dest-color': 'rgba(139, 0, 0, 0.5)',
    '--cg-move-dest-center': '#8b0000',
    '--cg-move-dest-hover': 'rgba(220, 20, 60, 0.4)',
    '--cg-selected-color': 'rgba(220, 20, 60, 0.5)',
    '--cg-oc-move-dest': 'rgba(139, 0, 0, 0.3)', // Outer circle for move destinations in red
  } as React.CSSProperties : {};

  return (
    <div className="chess-board-outer" style={boardStyle}>
      <div className="chess-board-inner">
        <Chessground key={boardKey} {...config} />
        {/* Banned Move Alert Overlay - Different based on difficulty */}
        {bannedMoveAlert && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
            {banDifficulty === 'hard' ? (
              // Hard mode: Aggressive red alert with shake
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
              // Medium mode: Softer warning with subtle animation
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
              // Easy mode: Simple X indicator
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
    </div>
  );
});

export default ChessBoard;
