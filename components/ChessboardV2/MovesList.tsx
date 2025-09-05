"use client";

import React, { memo, useRef, useEffect } from "react";

interface MovesListProps {
  bcnMoves: string[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  visibleRows?: number;
  fontSize?: number;
}

const MovesList = memo(function MovesList({
  bcnMoves,
  currentMoveIndex,
  onMoveClick,
  visibleRows = 10,
  fontSize = 14,
}: MovesListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLButtonElement>(null);
  
  // Auto-scroll to current move
  useEffect(() => {
    if (currentMoveRef.current && scrollContainerRef.current) {
      const button = currentMoveRef.current;
      const container = scrollContainerRef.current;
      const buttonTop = button.offsetTop;
      const buttonBottom = buttonTop + button.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      
      if (buttonBottom > containerBottom) {
        container.scrollTop = buttonTop - container.clientHeight + button.offsetHeight + 20;
      } else if (buttonTop < containerTop) {
        container.scrollTop = buttonTop - 20;
      }
    }
  }, [currentMoveIndex]);
  // Group moves into full moves (4 plies per move: white ban, white move, black ban, black move)
  type MoveEntry = {
    whiteBan?: { text: string; index: number };
    whiteMove?: { text: string; index: number };
    blackBan?: { text: string; index: number };
    blackMove?: { text: string; index: number };
    moveNumber: number;
  };
  
  const fullMoves: MoveEntry[] = [];
  
  let moveNumber = 1;
  
  for (let i = 0; i < bcnMoves.length; i += 4) {
    const move: MoveEntry = { moveNumber };
    
    // White's ban
    if (i < bcnMoves.length) {
      move.whiteBan = { text: bcnMoves[i], index: i };
    }
    // White's move
    if (i + 1 < bcnMoves.length) {
      move.whiteMove = { text: bcnMoves[i + 1], index: i + 1 };
    }
    // Black's ban
    if (i + 2 < bcnMoves.length) {
      move.blackBan = { text: bcnMoves[i + 2], index: i + 2 };
    }
    // Black's move
    if (i + 3 < bcnMoves.length) {
      move.blackMove = { text: bcnMoves[i + 3], index: i + 3 };
    }
    
    fullMoves.push(move);
    moveNumber++;
  }

  // Helper to format move display
  const formatMove = (text: string) => {
    if (text.startsWith('b:')) {
      // Ban: show just the squares
      return text.slice(2, 6);
    } else if (text.startsWith('m:')) {
      // Move: show just the squares
      return text.slice(2, 6);
    }
    // SAN notation (already formatted)
    return text;
  };
  
  // Check if a move is a ban
  const isBan = (text: string) => text.startsWith('b:');
  
  const renderMoveButton = (ply: { text: string; index: number } | undefined, _isBanColumn: boolean) => {
    if (!ply) {
      // Return empty space
      return <div className="inline-block" />;
    }
    
    const isCurrentMove = currentMoveIndex === ply.index;
    const isBanMove = isBan(ply.text);
    const buttonText = formatMove(ply.text);
    // Calculate actual text width (approximate)
    const textWidth = buttonText.length * (fontSize * 0.6);
    
    return (
      <button
        ref={isCurrentMove ? currentMoveRef : null}
        onClick={() => onMoveClick(ply.index)}
        className={`px-1.5 py-0.5 rounded transition-all font-mono inline-block ${
          isCurrentMove
            ? "bg-blue-500/20 dark:bg-blue-400/20 ring-1 ring-blue-500/30"
            : isBanMove 
              ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
              : "text-foreground hover:bg-gray-500/10"
        }`}
        style={{ 
          fontSize: `${fontSize}px`,
          minWidth: `${textWidth}px`
        }}
        title={ply.text}
      >
        {buttonText}
      </button>
    );
  };
  
  // Calculate row height based on font size (roughly 2x font size for padding)
  const rowHeight = fontSize * 2.2;
  // Calculate container height based on visible rows
  const containerHeight = visibleRows * rowHeight + 24; // +24 for padding
  
  // Column widths
  const moveNumberWidth = fontSize * 2.5;
  const banColumnWidth = fontSize * 3;
  const moveColumnWidth = fontSize * 3.5;
  
  return (
    <div className="bg-background-secondary rounded-lg p-3" style={{ height: `${containerHeight}px` }}>
      <div ref={scrollContainerRef} className="overflow-y-auto border-4 border-black dark:border-white rounded" style={{ height: `${visibleRows * rowHeight}px` }}>
        <table style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: `${moveNumberWidth}px` }} />
            <col style={{ width: `${banColumnWidth}px` }} />
            <col style={{ width: `${moveColumnWidth}px` }} />
            <col style={{ width: `${banColumnWidth}px` }} />
            <col style={{ width: `${moveColumnWidth}px` }} />
          </colgroup>
        <tbody>
          {fullMoves.map((move, index) => {
            const isLightRow = index % 2 === 0;
            
            return (
              <tr 
                key={move.moveNumber} 
                className={index !== fullMoves.length - 1 ? "border-b border-gray-400" : ""}
              >
                {/* Move number column */}
                <td className={`px-2 text-center ${
                  isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                }`} style={{ height: `${rowHeight}px` }}>
                  <span className="font-bold text-foreground-muted" style={{ fontSize: `${fontSize}px` }}>
                    {move.moveNumber}.
                  </span>
                </td>
                
                {/* White ban column */}
                <td className={`px-1 text-left ${
                  isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                }`} style={{ height: `${rowHeight}px` }}>
                  {renderMoveButton(move.whiteBan, true)}
                </td>
                
                {/* White move column */}
                <td className={`px-1 text-left border-r-2 border-gray-400 ${
                  isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                }`} style={{ height: `${rowHeight}px` }}>
                  {renderMoveButton(move.whiteMove, false)}
                </td>
                
                {/* Black ban column */}
                <td className={`px-1 text-left ${
                  !isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                }`} style={{ height: `${rowHeight}px` }}>
                  {renderMoveButton(move.blackBan, true)}
                </td>
                
                {/* Black move column */}
                <td className={`px-1 text-left ${
                  !isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                }`} style={{ height: `${rowHeight}px` }}>
                  {renderMoveButton(move.blackMove, false)}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
});

export default MovesList;