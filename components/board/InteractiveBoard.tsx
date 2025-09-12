"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import React, { memo, useMemo, useCallback } from "react";
import type { Config } from "chessground/config";
import type { Key, Dests } from "chessground/types";

/**
 * InteractiveBoard - Adds interaction layer to board visualization
 * 
 * This component handles user interactions like:
 * - Piece selection
 * - Move destinations
 * - Drag and drop
 * - Click to move
 * 
 * It remains stateless - all state is managed externally
 * and passed in as props.
 */

export interface InteractiveBoardProps {
  fen: string;
  orientation?: "white" | "black";
  
  // Interaction configuration
  movable?: {
    color?: "white" | "black" | "both";
    dests?: Map<string, string[]>; // Legal destinations
  };
  
  // Callbacks
  onMove?: (from: string, to: string) => void;
  onSelect?: (square: string) => void;
  
  // Visual highlights
  highlights?: {
    lastMove?: [string, string];
    check?: string;
    selected?: string;
  };
  
  // Drawable configuration for arrows/circles
  drawable?: {
    enabled?: boolean;
    autoShapes?: Array<{
      orig: Key;
      dest?: Key;
      brush?: string;
    }>;
  };
  
  // Board configuration
  coordinates?: boolean;
  size?: number;
  className?: string;
  
  // Theme/styling
  premove?: boolean;
}

const InteractiveBoard = memo(function InteractiveBoard({
  fen,
  orientation = "white",
  movable,
  onMove,
  onSelect,
  highlights,
  drawable,
  coordinates = false,
  size,
  className = "",
  premove = false,
}: InteractiveBoardProps) {
  // Convert destinations to Chessground format
  const dests: Dests = useMemo(() => {
    const destsMap = new Map<Key, Key[]>();
    if (movable?.dests) {
      movable.dests.forEach((squares, from) => {
        destsMap.set(from as Key, squares as Key[]);
      });
    }
    return destsMap;
  }, [movable?.dests]);

  // Handle move callback
  const handleAfterMove = useCallback(
    (orig: string, dest: string) => {
      if (onMove) {
        onMove(orig, dest);
        return true; // Allow the move
      }
      return false; // Reject if no handler
    },
    [onMove]
  );

  // Handle square selection
  const handleSelect = useCallback(
    (square: Key) => {
      if (onSelect) {
        onSelect(square);
      }
    },
    [onSelect]
  );

  // Chessground configuration
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
        color: movable?.color,
        dests: dests,
        showDests: true,
        events: {
          after: handleAfterMove,
          select: handleSelect,
        },
      },
      selectable: {
        enabled: true,
      },
      highlight: {
        lastMove: !!highlights?.lastMove,
        check: !!highlights?.check,
      },
      lastMove: highlights?.lastMove as [Key, Key] | undefined,
      check: highlights?.check ? true : undefined,
      selected: highlights?.selected as Key | undefined,
      premovable: {
        enabled: premove,
      },
      drawable: {
        enabled: drawable?.enabled ?? false,
        visible: true,
        defaultBrush: "green",
        brushes: {
          green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
          red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
          blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
          yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
        },
        autoShapes: drawable?.autoShapes || [],
      },
      disableContextMenu: true,
    }),
    [
      fen,
      orientation,
      coordinates,
      movable?.color,
      dests,
      handleAfterMove,
      handleSelect,
      highlights,
      drawable,
      premove,
    ]
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
      className={`chess-board-interactive ${className}`}
      style={containerStyle}
    >
      <div className="chess-board-inner">
        <Chessground {...config} />
      </div>
    </div>
  );
});

export default InteractiveBoard;