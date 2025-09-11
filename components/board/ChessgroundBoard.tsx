"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import React, { memo, useMemo } from "react";
import type {
  Color,
  Dests,
  Key,
  ReactChessGroundProps,
} from "@bezalel6/react-chessground";

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
    const shapes: Array<{
      orig: Key;
      dest?: Key;
      brush?: string;
    }> = [];
    
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
  const drawableBrushes = useMemo(() => ({
    green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
    red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
    blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
    yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
    paleRed: { key: "pr", color: "#FF6B6B", opacity: 0.4, lineWidth: 10 }, // For subtle ban indication
  }), []);

  // Chessground configuration - using ALL its features
  const config = useMemo<ReactChessGroundProps>(() => {
    const baseConfig: ReactChessGroundProps = {
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
      check: (check && highlight.check) ? check as Color | boolean : undefined,
      
      // Movable configuration
      movable: viewOnly ? {
        free: false,
        color: undefined,
        showDests: false,
      } : {
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
      style.width = '100%';
      style.height = '100%';
    }
    return style;
  }, [size]);

  // Apply ban mode theming through CSS variables
  const boardStyle = useMemo(() => {
    const style: Record<string, string | number> = { ...containerStyle };
    
    if (actionType === "ban") {
      // Add CSS variables for ban mode
      style['--cg-move-dest-color'] = 'rgba(139, 0, 0, 0.5)';
      style['--cg-move-dest-center'] = '#8b0000';
      style['--cg-move-dest-hover'] = 'rgba(220, 20, 60, 0.4)';
      style['--cg-selected-color'] = 'rgba(220, 20, 60, 0.5)';
      style['--cg-oc-move-dest'] = 'rgba(139, 0, 0, 0.3)';
    }
    
    return style as React.CSSProperties;
  }, [actionType, containerStyle]);

  return (
    <div 
      className={`chessground-board ${actionType === 'ban' ? 'ban-mode' : ''} ${className}`}
      style={boardStyle}
    >
      <div className="chess-board-inner">
        <Chessground {...config} />
      </div>
    </div>
  );
});

export default ChessgroundBoard;