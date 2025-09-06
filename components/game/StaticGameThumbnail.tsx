"use client";

import { useMemo, useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";

interface StaticGameThumbnailProps {
  fen: string;
  orientation?: "white" | "black";
  size?: number;
  result?: string;
  onClick?: () => void;
}

export default function StaticGameThumbnail({
  fen,
  orientation = "white",
  size,
  result,
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

  const style = size ? { width: size, height: size } : {};

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-gray-800"
      style={style}
      onClick={onClick}
    >
      <div
        className="absolute inset-0"
        ref={boardRef}
      />
      
      {/* Result overlay */}
      {result && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-white text-sm font-semibold text-center">
            {result === "1-0" && "White wins"}
            {result === "0-1" && "Black wins"}
            {result === "1/2-1/2" && "Draw"}
          </div>
        </div>
      )}
    </div>
  );
}