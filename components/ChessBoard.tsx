"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { memo, useMemo, useState, useCallback } from "react";
import type {
  Dests,
  Key,
  ReactChessGroundProps,
} from "@bezalel6/react-chessground";
import type { Ban, Move, SimpleGameState } from "@/lib/game-types";
import { getCurrentBan, parseFEN } from "@/lib/game-types";
import { useGameRole } from "@/contexts/GameRoleContext";

interface ChessBoardProps {
  gameState: SimpleGameState;
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
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
  onMove,
  onBan,
}: ChessBoardProps) {
  const { role, orientation, canMove } = useGameRole();
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
    if (!canMove) return undefined;

    // Role determines what pieces can be moved
    if (role === "spectator") return undefined;
    return role as "white" | "black";
  }, [canMove, role]);

  // Extract values from parsed FEN and game state (needs to be before hook calls)
  const currentBan = gameState ? getCurrentBan(gameState.fen) : null;
  const nextAction = gameState?.nextAction || "move";
  const isInCheck = gameState?.inCheck || false;

  // Build legal moves map from server - memoized to prevent re-creation
  const dests: Dests = useMemo(() => {
    const destsMap = new Map<Key, Key[]>();
    if (gameState?.legalActions) {
      gameState.legalActions.forEach((action: string) => {
        const from = action.substring(0, 2) as Key;
        const to = action.substring(2, 4) as Key;

        if (!destsMap.has(from)) {
          destsMap.set(from, []);
        }
        destsMap.get(from)!.push(to);
      });
    }
    return destsMap;
  }, [gameState?.legalActions]);

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
    },
    [gameState, fenData, nextAction, onMove, onBan],
  );

  // More stable board key - only remount when position actually changes
  const boardKey = useMemo(
    () =>
      `${fenData?.position || "initial"}-${fenData?.turn || "w"}-${
        gameState?.gameOver ? "over" : "active"
      }`,
    [fenData?.position, fenData?.turn, gameState?.gameOver],
  );

  // Memoize config early to comply with Rules of Hooks
  const config: ReactChessGroundProps = useMemo(
    () => ({
      fen:
        fenData?.position ||
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      orientation,
      coordinates: false,
      autoCastle: true,
      highlight: {
        lastMove: true,
      },
      check: isInCheck ? fenData?.turn : undefined,
      lastMove: undefined,
      animation: {
        enabled: true,
        duration: 200,
      },
      movable: {
        free: false,
        color: movableColor,
        dests: canMove ? dests : new Map(),
        showDests: true,
        events: {
          after: handleAfterMove,
        },
      },
      selectable: {
        enabled: canMove,
      },
      premovable: {
        enabled: false,
      },
      drawable: {
        enabled: true,
        visible: true,
        autoShapes: currentBan
          ? [
              {
                orig: currentBan.from as Key,
                dest: currentBan.to as Key,
                brush: "red",
              },
            ]
          : [],
      },
    }),
    [
      fenData,
      orientation,
      isInCheck,
      movableColor,
      canMove,
      dests,
      handleAfterMove,
      currentBan,
    ],
  );

  // Safety check: If gameState or fenData is invalid, return a placeholder
  if (!gameState || !gameState.fen || !fenData) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  // Debug logging
  console.log("[ChessBoard] State:", {
    role,
    turn: fenData.turn,
    nextAction,
    orientation,
    movableColor,
    canMove,
    legalActionCount: gameState.legalActions?.length || 0,
    players: gameState.players,
    currentBan,
    banState: fenData.banState,
    isInCheck, // Add check state to debug output
  });

  // Extra debug for ban display
  if (currentBan) {
    console.log("[ChessBoard] BAN SHOULD BE VISIBLE:", currentBan);
  } else {
    console.log("[ChessBoard] No ban to display");
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
