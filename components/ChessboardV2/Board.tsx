"use client";

import React, { memo, useMemo, useCallback } from "react";
import Chessground from "@bezalel6/react-chessground";
import "@bezalel6/react-chessground/dist/react-chessground.css";
import type { ReactChessGroundProps } from "@bezalel6/react-chessground";
import type { Key, Dests } from "./types";
import type { 
  BoardPosition, 
  BoardPermissions, 
  BoardConfig, 
  BoardHandlers,
  ActionType,
  Square 
} from "./types";

interface BoardProps {
  position: BoardPosition;
  destinations: Map<Square, Square[]>;
  permissions: BoardPermissions;
  config: BoardConfig;
  handlers: BoardHandlers;
  actionType: ActionType;
  currentBan?: { from: Square; to: Square };
  refreshKey?: number;
}

const Board = memo(function Board({
  position,
  destinations,
  permissions,
  config,
  handlers,
  actionType,
  currentBan,
  refreshKey = 0,
}: BoardProps) {
  // Convert destinations to chessground format
  const dests: Dests = useMemo(() => {
    const destsMap = new Map<Key, Key[]>();
    destinations.forEach((squares, from) => {
      destsMap.set(from as Key, squares as Key[]);
    });
    return destsMap;
  }, [destinations]);

  // Handle move/ban actions
  const handleAfterMove = useCallback(
    (orig: string, dest: string) => {
      if (actionType === "ban") {
        handlers.onBan({ from: orig, to: dest });
      } else {
        // Check for pawn promotion
        const piece = getPieceFromFEN(position.fen, orig);
        const isPromotion = (piece === "P" || piece === "p") && 
                           (dest[1] === "8" || dest[1] === "1");
        
        if (isPromotion) {
          // For now, auto-promote to queen
          // In a real implementation, you'd show a promotion dialog
          handlers.onMove({
            from: orig,
            to: dest,
            promotion: "q",
          });
        } else {
          handlers.onMove({
            from: orig,
            to: dest,
          });
        }
      }
      return true;
    },
    [actionType, handlers, position.fen]
  );

  // Create chessground configuration
  const chessgroundConfig = useMemo<ReactChessGroundProps>(() => ({
    fen: position.fen,
    orientation: config.orientation,
    coordinates: config.coordinates ?? false,
    autoCastle: true,
    disableContextMenu: true,
    highlight: {
      lastMove: config.highlight?.lastMove ?? true,
    },
    check: position.check,
    lastMove: position.lastMove as [Key, Key] | undefined,
    animation: {
      enabled: config.animation?.enabled ?? true,
      duration: config.animation?.duration ?? 200,
    },
    movable: {
      free: false,
      color: permissions.movableColor,
      dests: permissions.canInteract ? dests : new Map(),
      showDests: true,
      rookCastle: true,
      events: {
        after: handleAfterMove,
      },
    },
    selectable: {
      enabled: permissions.canInteract,
    },
    drawable: {
      enabled: true,
      visible: true,
      defaultBrush: actionType === "ban" ? "red" : "green",
      brushes: {
        green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
        red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
        blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
        yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
      },
      autoShapes: currentBan && currentBan.from && currentBan.to
        ? [{
            orig: currentBan.from as Key,
            dest: currentBan.to as Key,
            brush: "red",
          }]
        : [],
    },
  }), [
    position,
    config,
    permissions,
    dests,
    handleAfterMove,
    actionType,
    currentBan,
  ]);

  const boardKey = `board-${refreshKey}`;

  return (
    <div className="chess-board-outer overflow-hidden">
      <div className="chess-board-inner">
        <Chessground key={boardKey} {...chessgroundConfig} />
      </div>
    </div>
  );
});

// Helper to get piece from FEN at a given square
function getPieceFromFEN(fen: string, square: string): string | null {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  
  const rows = fen.split(" ")[0].split("/");
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

export default Board;