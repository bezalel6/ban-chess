"use client";

import React from "react";
import GameViewer from "../../components/ChessboardV2/GameViewer";

const game = {
  id: "f7e489d4-07de-41d3-b20e-b3f8fcc03416",
  whitePlayerId: "cmf2xyot90000nu01jsyhostc",
  blackPlayerId: "cmf4ih31v0000qp0157px1x87",
  bcn: [
    "b:e2e4",
    "m:d2d4",
    "b:e7e5",
    "m:g8f6",
    "b:g1f3",
    "m:e2e4",
    "b:f6e4",
    "m:d7d6",
    "b:g1f3",
    "m:e4e5",
    "b:d6e5",
    "m:f6e4",
    "b:f2f3",
    "m:d1h5",
    "b:g7g6",
    "m:d6e5",
    "b:h5f7",
    "m:h5f5",
    "b:c8f5",
    "m:e4d6",
    "b:f5e5",
    "m:d4e5",
    "b:d6f5",
    "m:c8f5",
    "b:e5d6",
    "m:g2g4",
    "b:f5g4",
    "m:f5e4",
    "b:e5d6",
    "m:e5e6",
    "b:f7e6",
    "m:e4h1",
    "b:f1g2",
    "m:b1c3",
    "b:f7e6",
    "m:f7f6",
    "b:c1f4",
    "m:c3d5",
    "b:h1d5",
    "m:c7c6",
    "b:c1f4",
    "m:d5c7",
    "b:d8c7",
  ],
  moveTimes: [
    37430, 5355, 3108, 12331, 19988, 9132, 1212, 32247, 11313, 17903, 1166,
    30967, 8533, 15105, 2642, 59325, 8341, 20357, 1561, 21956, 7824, 3109, 1536,
    12483, 7383, 16038, 1032, 10426, 5924, 45837, 658, 17093, 19918, 21340,
    5705, 36474, 19356, 13919, 1367, 31546, 20637, 64481, 1155,
  ],
  finalPosition:
    "rn1qkb1r/ppN1p1pp/2pnPp2/8/6P1/8/PPP2P1P/R1B1KBNb b Qkq - 1 11 44:d8c7",
  result: "White wins by checkmate!",
  resultReason: "checkmate",
  timeControl: "900+10",
  moveCount: 21,
  createdAt: "2025-09-03T22:06:00.931",
};

export default function Miniboard() {
  const [visibleRows, setVisibleRows] = React.useState(10);
  const [fontSize, setFontSize] = React.useState(14);
  
  return (
    <div className="p-8 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6">Ban Chess Game Viewer</h2>
      
      {/* Controls */}
      <div className="flex gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-xs text-foreground-muted mb-1">Visible Rows: {visibleRows}</label>
          <input
            type="range"
            min="1"
            max="20"
            value={visibleRows}
            onChange={(e) => setVisibleRows(Number(e.target.value))}
            className="w-32"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-xs text-foreground-muted mb-1">Font Size: {fontSize}px</label>
          <input
            type="range"
            min="8"
            max="32"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-32"
          />
        </div>
      </div>
      
      <GameViewer 
        initialBcn={game.bcn} 
        visibleRows={visibleRows}
        fontSize={fontSize}
      />
    </div>
  );
}