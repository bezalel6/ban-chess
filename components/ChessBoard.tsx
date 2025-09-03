"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { memo, useMemo, useState, useCallback, useEffect } from "react";
import type {
  Dests,
  Key,
  ReactChessGroundProps,
} from "@bezalel6/react-chessground";
import type { Ban, Move, SimpleGameState, Square } from "@/lib/game-types";
import { getCurrentBan, parseFEN } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { BanChess } from "ban-chess.ts";

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
  const { role, orientation: contextOrientation } = useUserRole();

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
  const isInCheck = false; // TODO: Get from BanChess instance if needed for UI
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

    return destsMap;
  }, [propDests]);

  // Memoize the move handler
  const handleAfterMove = useCallback(
    (orig: string, dest: string) => {
      if (!gameState || !fenData) return;

      if (nextAction === "ban") {
        onBan({ from: orig, to: dest });
      } else {
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
    [gameState, fenData, nextAction, onMove, onBan]
  );

  // Board key that incorporates external refresh trigger
  const boardKey = useMemo(() => `board-${refreshKey}`, [refreshKey]);

  // Memoize config early to comply with Rules of Hooks
  const config: ReactChessGroundProps = useMemo(
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
        rookCastle: false, // Disable castling during ban phase
        events: {
          after: handleAfterMove,
        },
      },
      selectable: {
        enabled: canMove || canBan,
      },
      premovable: {
        enabled: false,
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
  return (
    <div className="chess-board-outer">
      <div className="chess-board-inner">
        <Chessground key={boardKey} {...config} />
      </div>
    </div>
  );
});

export default ChessBoard;
