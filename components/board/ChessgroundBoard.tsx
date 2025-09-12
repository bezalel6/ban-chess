"use client";
import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import React, { memo, useMemo, useEffect, useRef } from "react";
import type { Config } from "chessground/config";
import type { DrawShape, DrawBrushes } from "chessground/draw";
import type { Color, Key, Dests } from "chessground/types";

/**
 * ChessgroundBoard - Unified board component using react-chessground
 *
 * This component leverages ALL of react-chessground's built-in features:
 * - Piece rendering and animations
 * - Move destinations and legal moves
 * - Selection and highlighting
 * - Arrows and shapes for ban visualization
 * - Check/checkmate indicators
 * - Premoves and predictions
 *
 * All visualization and interaction is achieved through configuration,
 * not through separate overlay components.
 */

export interface ChessgroundBoardProps {
  // Core board state
  fen: string;
  orientation?: "white" | "black";

  // Game state
  turn?: "white" | "black";
  check?: "white" | "black"; // Color of king in check
  lastMove?: [string, string]; // [from, to]

  // Interaction
  viewOnly?: boolean; // Completely disable interaction
  movable?: {
    color?: "white" | "black" | "both"; // Which color can move
    dests?: Map<string, string[]>; // Legal destinations
    showDests?: boolean; // Show dots on valid destinations
  };

  // Layout
  size?: number; // Board size in pixels

  // Ban visualization (using drawable arrows)
  bannedMove?: {
    from: string;
    to: string;
  };

  // Events
  onMove?: (from: string, to: string) => void;
  onPremove?: (from: string, to: string) => void;

  // Visual configuration
  coordinates?: boolean;
  animation?: boolean;
  highlight?: {
    lastMove?: boolean;
    check?: boolean;
  };

  // Ban mode theming (changes destination dots to red)
  actionType?: "move" | "ban";

  // Styling
  className?: string;
}

const ChessgroundBoard = memo(function ChessgroundBoard({
  fen,
  orientation = "white",
  turn = "white",
  check,
  lastMove,
  viewOnly = false,
  movable,
  bannedMove,
  onMove,
  onPremove,
  coordinates = false,
  animation = true,
  highlight = { lastMove: true, check: true },
  actionType = "move",
  size,
  className = "",
}: ChessgroundBoardProps) {
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

  // Create auto shapes for ban visualization
  const autoShapes = useMemo(() => {
    const shapes: Array<DrawShape> = [];

    // Add banned move as a red arrow
    if (bannedMove) {
      shapes.push({
        orig: bannedMove.from as Key,
        dest: bannedMove.to as Key,
        brush: "red",
      });
    }

    return shapes;
  }, [bannedMove]);

  // Configure drawable brushes for different visualizations
  const drawableBrushes: DrawBrushes = useMemo(
    () => ({
      green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
      red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
      blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
      yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
      paleRed: { key: "pr", color: "#FF6B6B", opacity: 0.4, lineWidth: 10 }, // For subtle ban indication
    }),
    []
  );

  // Chessground configuration - using ALL its features
  const config = useMemo<Config>(() => {
    const baseConfig: Config = {
      fen,
      orientation,
      turnColor: turn,
      coordinates,
      autoCastle: true,
      disableContextMenu: true,

      // Visual settings
      animation: {
        enabled: animation,
        duration: 100,
      },

      // Highlighting
      highlight: {
        lastMove: highlight.lastMove ?? true,
        check: highlight.check ?? true,
      },
      lastMove: lastMove as [Key, Key] | undefined,
      check: check && highlight.check ? (check as Color | boolean) : undefined,

      // Movable configuration
      movable: viewOnly
        ? {
            free: false,
            color: undefined,
            showDests: false,
          }
        : {
            free: false,
            color: movable?.color,
            dests: dests,
            showDests: movable?.showDests ?? true,
            rookCastle: true,
            events: {
              after: (orig: Key, dest: Key) => {
                onMove?.(orig, dest);
              },
            },
          },

      // Selectable
      selectable: {
        enabled: !viewOnly,
      },

      // Premove configuration
      premovable: {
        enabled: !viewOnly && !!onPremove,
        showDests: true,
        events: {
          set: (orig: Key, dest: Key) => {
            onPremove?.(orig, dest);
          },
        },
      },

      // Drawable for ban arrows and other annotations
      drawable: {
        enabled: true,
        visible: true,
        brushes: drawableBrushes,
        autoShapes: autoShapes,
      },
    };

    return baseConfig;
  }, [
    fen,
    orientation,
    turn,
    coordinates,
    animation,
    highlight,
    lastMove,
    check,
    viewOnly,
    movable?.color,
    movable?.showDests,
    dests,
    onMove,
    onPremove,
    drawableBrushes,
    autoShapes,
  ]);

  // Board container styles
  const containerStyle = useMemo(() => {
    const style: Record<string, string | number> = {};
    if (size) {
      style.width = `${size}px`;
      style.height = `${size}px`;
    } else {
      // Default size if not specified - no max-width constraint
      style.width = "100%";
      style.height = "100%";
    }
    return style;
  }, [size]);

  // Apply ban mode theming through CSS variables
  const boardStyle = useMemo(() => {
    const style: Record<string, string | number> = { ...containerStyle };

    if (actionType === "ban") {
      // Add CSS variables for ban mode - ALL destinations are red
      style["--cg-move-dest-color"] = "rgba(139, 0, 0, 0.5)";
      style["--cg-move-dest-center"] = "#8b0000";
      style["--cg-move-dest-hover"] = "rgba(220, 20, 60, 0.4)";
      style["--cg-selected-color"] = "rgba(220, 20, 60, 0.5)";
      style["--cg-oc-move-dest"] = "rgba(139, 0, 0, 0.3)";
    }

    return style as React.CSSProperties;
  }, [actionType, containerStyle]);

  const boardRef = useRef<HTMLDivElement>(null);

  // Add class to banned destination square
  useEffect(() => {
    // Helper to convert square name (e.g., "e4") to board coordinates
    const squareToCoords = (square: string): { x: number; y: number } => {
      const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
      const rank = parseInt(square[1]) - 1; // 1=0, 2=1, etc.

      // Adjust for orientation
      const x = orientation === "white" ? file : 7 - file;
      const y = orientation === "white" ? 7 - rank : rank;

      return { x, y };
    };

    const currentBoardRef = boardRef.current; // Capture ref value for cleanup

    if (actionType === "move" && bannedMove?.to && currentBoardRef) {
      const boardContainer = currentBoardRef.querySelector(".cg-wrap");
      if (!boardContainer) return;

      // Calculate position of the banned square
      const { x, y } = squareToCoords(bannedMove.to);

      // Find all move-dest squares
      const destSquares = boardContainer.querySelectorAll("square.move-dest");

      // Find the square at the banned position by checking transform values
      destSquares.forEach((square) => {
        const transform = (square as HTMLElement).style.transform;
        if (transform) {
          // Parse the transform to get position
          const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
          if (match) {
            const squareX = parseFloat(match[1]);
            const squareY = parseFloat(match[2]);

            // Calculate expected position (assuming 8x8 grid)
            const board = boardContainer.querySelector("cg-board");
            if (board) {
              const boardWidth = board.clientWidth;
              const squareSize = boardWidth / 8;
              const expectedX = x * squareSize;
              const expectedY = y * squareSize;

              // Check if this is the banned square (with small tolerance for rounding)
              if (
                Math.abs(squareX - expectedX) < 1 &&
                Math.abs(squareY - expectedY) < 1
              ) {
                square.classList.add("banned-dest");
              } else {
                square.classList.remove("banned-dest");
              }
            }
          }
        }
      });
    }

    // Cleanup function to remove the class
    return () => {
      if (currentBoardRef) {
        const destSquares =
          currentBoardRef.querySelectorAll("square.banned-dest");
        destSquares.forEach((square) => square.classList.remove("banned-dest"));
      }
    };
  }, [actionType, bannedMove?.to, orientation]);

  return (
    <div
      ref={boardRef}
      className={`chessground-board ${
        actionType === "ban" ? "ban-mode" : ""
      } ${className}`}
      style={boardStyle}
    >
      <div className="chess-board-inner">
        <Chessground {...config} />
      </div>
    </div>
  );
});

export default ChessgroundBoard;
