"use client";

import React, { memo, useRef, useEffect, useState } from "react";

interface MovesListProps {
  bcnMoves: string[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  onNavigate?: (index: number) => void;
  totalMoves?: number;
}

const MovesList = memo(function MovesList({
  bcnMoves,
  currentMoveIndex,
  onMoveClick,
  onNavigate,
  totalMoves = 0,
}: MovesListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLButtonElement>(null);
  
  // Settings state with localStorage
  const [showSettings, setShowSettings] = useState(false);
  const [visibleRows, setVisibleRows] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('movesList.visibleRows');
      return stored ? Number(stored) : 4;
    }
    return 4;
  });
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('movesList.fontSize');
      return stored ? Number(stored) : 19;
    }
    return 19;
  });
  
  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('movesList.visibleRows', String(visibleRows));
  }, [visibleRows]);
  
  useEffect(() => {
    localStorage.setItem('movesList.fontSize', String(fontSize));
  }, [fontSize]);
  
  // Auto-scroll to current move
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const currentMoveRow = Math.floor(currentMoveIndex / 4);
      const rowElement = container.querySelector(`tr:nth-child(${currentMoveRow + 1})`) as HTMLElement;
      
      if (rowElement) {
        const rowTop = rowElement.offsetTop;
        const rowHeight = rowElement.offsetHeight;
        const containerHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // Check if row is outside visible area
        if (rowTop < scrollTop || rowTop + rowHeight > scrollTop + containerHeight) {
          // Center the row in the container
          container.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
        }
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
    isEmpty?: boolean;
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
  
  // Remember actual move count before adding empty rows
  const _actualMoveCount = fullMoves.length;
  
  // Add empty rows if needed
  while (fullMoves.length < visibleRows) {
    fullMoves.push({ 
      moveNumber: fullMoves.length + 1, 
      isEmpty: true 
    });
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
    <div className="bg-background-secondary rounded-lg p-3" style={{ height: `${containerHeight + 50}px` }}>
      
      {/* Settings popup */}
      {showSettings && (
        <div className="absolute top-10 right-2 bg-background border-2 border-gray-600 dark:border-gray-400 rounded-lg shadow-lg p-4 z-20" style={{ minWidth: '250px' }}>
          <h4 className="font-semibold mb-3 text-base">Moves List Settings</h4>
          
          <div className="mb-3">
            <label className="text-sm text-foreground-muted block mb-1">Visible Rows: {visibleRows}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={visibleRows}
              onChange={(e) => setVisibleRows(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="mb-3">
            <label className="text-sm text-foreground-muted block mb-1">Font Size: {fontSize}px</label>
            <input
              type="range"
              min="8"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <button
            onClick={() => setShowSettings(false)}
            className="w-full px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      )}
      
      <div ref={scrollContainerRef} className="overflow-y-auto border-4 border-black dark:border-white rounded mb-2" style={{ height: `${visibleRows * rowHeight}px` }}>
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
                className={`${index !== fullMoves.length - 1 && !move.isEmpty ? "border-b border-gray-400" : ""} ${move.isEmpty ? "pointer-events-none" : ""}`}
              >
                {/* Move number column */}
                <td className={`px-2 text-center ${
                  isLightRow ? "bg-white/40 dark:bg-black/5" : "bg-black/25 dark:bg-white/10"
                } ${move.isEmpty ? "opacity-0" : ""}`} style={{ height: `${rowHeight}px` }}>
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
      
      {/* Navigation controls */}
      <div className="flex gap-1 items-center">
        <button
          onClick={() => onNavigate?.(0)}
          className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          title="First move (Home/↑)"
        >
          ⏮
        </button>
        <button
          onClick={() => onNavigate?.(Math.max(0, currentMoveIndex - 1))}
          className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          title="Previous move (←)"
        >
          ◀
        </button>
        <button
          onClick={() => onNavigate?.(Math.min(totalMoves - 1, currentMoveIndex + 1))}
          className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          title="Next move (→)"
        >
          ▶
        </button>
        <button
          onClick={() => onNavigate?.(totalMoves - 1)}
          className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          title="Last move (End/↓)"
        >
          ⏭
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default MovesList;