"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { memo } from "react";
import type { ReactChessGroundProps } from "@bezalel6/react-chessground";

interface MiniBoardProps {
  fen: string;
  orientation?: "white" | "black";
}

const MiniBoard = memo(function MiniBoard({
  fen,
  orientation = "white",
}: MiniBoardProps) {
  const config: ReactChessGroundProps = {
    fen,
    orientation,
    coordinates: false,
    viewOnly: true,
    drawable: {
      visible: false,
    },
    movable: {
      free: false,
      color: undefined,
      dests: new Map(),
    },
    highlight: {
      lastMove: false,
    },
    animation: {
      enabled: false,
    },
    disableContextMenu: true,
  };

  return (
    <div className="mini-board-container w-full h-full relative">
      <div className="absolute inset-0">
        <Chessground {...config} />
      </div>
    </div>
  );
});

export default MiniBoard;