"use client";

import { useMemo, useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

interface StaticGameThumbnailProps {
  fen: string;
  orientation?: "white" | "black";
  onClick?: () => void;
}

export default function StaticGameThumbnail({
  fen,
  orientation = "white",
  onClick,
}: StaticGameThumbnailProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  
  // Parse FEN to get just the board position
  const boardFen = useMemo(() => {
    return fen.split(" ")[0];
  }, [fen]);

  useEffect(() => {
    if (boardRef.current && !apiRef.current) {
      apiRef.current = Chessground(boardRef.current, {
        fen: boardFen,
        orientation,
        viewOnly: true,
        drawable: { enabled: false },
        movable: { free: false },
        premovable: { enabled: false },
        animation: { enabled: false },
        coordinates: false,
      });
    }
    
    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [boardFen, orientation]);

  return (
    <div
      className="relative w-full h-full bg-gray-800 rounded-lg"
      onClick={onClick}
    >
      <div
        className="w-full h-full"
        ref={boardRef}
      />
    </div>
  );
}