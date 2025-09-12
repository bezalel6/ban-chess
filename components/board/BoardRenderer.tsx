"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import React, { memo, useMemo } from "react";
import type { Config } from "chessground/config";

/**
 * BoardRenderer - Pure visualization component
 * 
 * This component ONLY renders the chess board from a FEN string.
 * It has NO game logic, NO state management, and NO interactions.
 * 
 * Use this for:
 * - Static board displays
 * - Miniboards
 * - Board previews
 * - Any visualization-only needs
 */

export interface BoardRendererProps {
  fen: string;
  orientation?: "white" | "black";
  coordinates?: boolean;
  size?: number; // Board size in pixels
  className?: string;
}

const BoardRenderer = memo(function BoardRenderer({
  fen,
  orientation = "white",
  coordinates = false,
  size,
  className = "",
}: BoardRendererProps) {
  // Chessground configuration - purely visual
  const config = useMemo<Config>(
    () => ({
      fen,
      orientation,
      coordinates,
      animation: {
        enabled: true,
        duration: 100,
      },
      movable: {
        free: false,
        color: undefined, // No pieces are movable
        showDests: false,
      },
      selectable: {
        enabled: false, // No selection allowed
      },
      draggable: {
        enabled: false, // No dragging allowed
      },
      premovable: {
        enabled: false,
      },
      drawable: {
        enabled: false, // No drawing on board
      },
      highlight: {
        lastMove: false, // No move highlighting in pure renderer
      },
      disableContextMenu: true,
    }),
    [fen, orientation, coordinates]
  );

  // Board container styles
  const containerStyle = useMemo(() => {
    if (size) {
      return {
        width: `${size}px`,
        height: `${size}px`,
      };
    }
    return {};
  }, [size]);

  return (
    <div 
      className={`chess-board-renderer ${className}`}
      style={containerStyle}
    >
      <div className="chess-board-inner">
        <Chessground {...config} />
      </div>
    </div>
  );
});

export default BoardRenderer;