"use client";

import { useMemo, useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { DrawShape } from "chessground/draw";
import type { Key } from "chessground/types";
import { BanChess } from "ban-chess.ts";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";
import styles from "./StaticGameThumbnail.module.css";

interface StaticGameThumbnailProps {
  fen: string;
  orientation?: "white" | "black";
  bcn?: string[];  // Ban Chess Notation for banned moves
  onClick?: () => void;
}

export default function StaticGameThumbnail({
  fen,
  orientation = "white",
  bcn,
  onClick,
}: StaticGameThumbnailProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  
  // Parse FEN to get just the board position
  const boardFen = useMemo(() => {
    return fen.split(" ")[0];
  }, [fen]);
  
  // Check if position is in check using BanChess
  const isInCheck = useMemo(() => {
    try {
      const game = new BanChess(fen);
      return game.inCheck();
    } catch {
      return false;
    }
  }, [fen]);
  
  // Extract banned squares from BCN (last ban action if it exists)
  const bannedMove = useMemo(() => {
    if (!bcn || bcn.length === 0) return null;
    
    // Look for the last ban action in BCN
    for (let i = bcn.length - 1; i >= 0; i--) {
      const action = bcn[i];
      if (action.startsWith('b:')) {
        // Parse ban action format: "b:e2e4"
        const squares = action.slice(2);
        if (squares.length >= 4) {
          return {
            from: squares.slice(0, 2),
            to: squares.slice(2, 4),
          };
        }
      }
    }
    
    return null;
  }, [bcn]);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      // Create shapes for banned move indicator
      const shapes: DrawShape[] = [];
      if (bannedMove) {
        shapes.push({
          orig: bannedMove.from as Key,
          dest: bannedMove.to as Key,
          brush: 'red',
        });
      }
      
      apiRef.current = Chessground(boardRef.current, {
        fen: boardFen,
        orientation,
        viewOnly: true,
        drawable: { 
          enabled: false,
          visible: true,
          autoShapes: shapes,
        },
        movable: { free: false },
        premovable: { enabled: false },
        animation: { enabled: false },
        coordinates: false,
        highlight: {
          check: isInCheck,
        },
      });
      
      // Force the container to respect parent size
      const container = boardRef.current.querySelector('cg-container') as HTMLElement;
      if (container) {
        container.removeAttribute('style');
        
        // Watch for Chessground trying to set inline styles and remove them
        const observer = new MutationObserver(() => {
          if (container.hasAttribute('style')) {
            container.removeAttribute('style');
          }
        });
        
        observer.observe(container, { 
          attributes: true, 
          attributeFilter: ['style'] 
        });
        
        return () => {
          observer.disconnect();
          if (apiRef.current) {
            apiRef.current.destroy();
            apiRef.current = null;
          }
        };
      }
    }
    
    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [boardFen, orientation, isInCheck, bannedMove]);

  return (
    <div
      className={`${styles.boardContainer} static-thumbnail-board`}
      onClick={onClick}
    >
      <div
        className={styles.boardWrapper}
        ref={boardRef}
      />
    </div>
  );
}