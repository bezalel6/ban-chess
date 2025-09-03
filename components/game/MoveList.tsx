'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { HistoryEntry } from '@/lib/game-types';

interface MoveListProps {
  history: HistoryEntry[] | string[];
  onMoveSelect?: (moveIndex: number) => void;
  currentMoveIndex?: number;
}

export default function MoveList({ history, onMoveSelect, currentMoveIndex }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Update selected index when currentMoveIndex prop changes
  useEffect(() => {
    if (currentMoveIndex !== undefined) {
      setSelectedIndex(currentMoveIndex);
    }
  }, [currentMoveIndex]);
  
  // Auto-scroll to selected move when it changes
  useEffect(() => {
    if (scrollRef.current && selectedIndex !== null) {
      const selectedElement = scrollRef.current.querySelector(`[data-move-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!history || history.length === 0) return;
    
    const totalMoves = history.length;
    let newIndex = selectedIndex ?? -1;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(0, newIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(totalMoves - 1, newIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Move up by 4 (one full turn in ban-chess)
        newIndex = Math.max(0, newIndex - 4);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move down by 4 (one full turn in ban-chess)
        newIndex = Math.min(totalMoves - 1, newIndex + 4);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = totalMoves - 1;
        break;
      default:
        return;
    }
    
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
      onMoveSelect?.(newIndex);
    }
  }, [history, selectedIndex, onMoveSelect]);
  
  // Set up keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Handle click on move
  const handleMoveClick = (index: number) => {
    setSelectedIndex(index);
    onMoveSelect?.(index);
  };
  // When history updates and we're at the end, auto-follow
  useEffect(() => {
    // If we were at the last move before update, stay at the last move
    if (selectedIndex === null || selectedIndex === history.length - 2) {
      setSelectedIndex(history.length - 1);
    }
    // Otherwise, maintain current position in history
  }, [history.length, selectedIndex]); // React to length changes and selected index
  
  // Process history entries to create display rows with clickable elements
  interface DisplayRow {
    white?: { ban?: string; move?: string; banIndex?: number; moveIndex?: number };
    black?: { ban?: string; move?: string; banIndex?: number; moveIndex?: number };
  }
  
  const rows: DisplayRow[] = [];
  let currentRow: DisplayRow = {};
  let moveCount = 0;
  let actionIndex = 0;
  
  // Handle both object format (from ban-chess.ts) and string format
  if (history.length > 0 && typeof history[0] === 'object') {
    // New format: array of HistoryEntry objects
    const entries = history as HistoryEntry[];
    
    entries.forEach((entry) => {
      const isWhiteTurn = moveCount % 2 === 0;
      
      if (entry.actionType === 'ban') {
        // Format ban as "e2-e4"
        const banText = `${entry.action.from}-${entry.action.to}`;
        
        // Add ban to current position with index
        if (isWhiteTurn) {
          currentRow.white = { ban: banText, banIndex: actionIndex };
        } else {
          currentRow.black = { ban: banText, banIndex: actionIndex };
        }
      } else if (entry.actionType === 'move') {
        // Use SAN notation if available
        const moveText = entry.san || `${entry.action.from}${entry.action.to}`;
        
        // Add move to the existing ban entry or create new
        if (isWhiteTurn) {
          if (!currentRow.white) currentRow.white = {};
          currentRow.white.move = moveText;
          currentRow.white.moveIndex = actionIndex;
        } else {
          if (!currentRow.black) currentRow.black = {};
          currentRow.black.move = moveText;
          currentRow.black.moveIndex = actionIndex;
          // Complete row for black, push and reset
          rows.push(currentRow);
          currentRow = {};
        }
        
        moveCount++;
      }
      actionIndex++;
    });
    
    // Push incomplete row if exists
    if (currentRow.white || currentRow.black) {
      rows.push(currentRow);
    }
  } else {
    // Legacy format: array of strings - no bans to show
    (history as string[]).forEach((move, i) => {
      if (i % 2 === 0) {
        currentRow.white = { move, moveIndex: i };
      } else {
        currentRow.black = { move, moveIndex: i };
        rows.push(currentRow);
        currentRow = {};
      }
      actionIndex++;
    });
    if (currentRow.white) {
      rows.push(currentRow);
    }
  }

  return (
    <div ref={scrollRef} className="bg-background-tertiary rounded-lg p-2 h-full overflow-y-auto">
      <table className="w-full text-sm border-collapse border border-border">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-background-secondary/50 h-8">
              <td className={`px-2 py-1 text-foreground-muted font-semibold align-middle text-center border border-border w-8 ${
                index % 2 === 0 ? 'bg-background-secondary/30' : 'bg-background-tertiary/50'
              }`}>
                {index + 1}.
              </td>
              <td className={`px-2 py-1 text-left align-middle border border-border ${
                index % 2 === 0 ? 'bg-background-secondary/20' : 'bg-background-tertiary/30'
              }`}>
                {row.white && (
                  <span className="text-foreground font-medium">
                    {row.white.ban && (
                      <span 
                        className={`text-red-500 font-bold cursor-pointer hover:bg-red-500/20 px-1 rounded ${
                          selectedIndex === row.white.banIndex ? 'bg-red-500/30' : ''
                        }`}
                        onClick={() => row.white?.banIndex !== undefined && handleMoveClick(row.white.banIndex)}
                        data-move-index={row.white.banIndex}
                      >
                        {row.white.ban}
                      </span>
                    )}
                    {row.white.ban && row.white.move && ' '}
                    {row.white.move && (
                      <span 
                        className={`cursor-pointer hover:bg-blue-500/20 px-1 rounded ${
                          selectedIndex === row.white.moveIndex ? 'bg-blue-500/30' : ''
                        }`}
                        onClick={() => row.white?.moveIndex !== undefined && handleMoveClick(row.white.moveIndex)}
                        data-move-index={row.white.moveIndex}
                      >
                        {row.white.move}
                      </span>
                    )}
                  </span>
                )}
              </td>
              <td className={`px-2 py-1 text-left align-middle border border-border ${
                index % 2 === 0 ? 'bg-background-secondary/20' : 'bg-background-tertiary/30'
              }`}>
                {row.black && (
                  <span className="text-foreground font-medium">
                    {row.black.ban && (
                      <span 
                        className={`text-red-500 font-bold cursor-pointer hover:bg-red-500/20 px-1 rounded ${
                          selectedIndex === row.black.banIndex ? 'bg-red-500/30' : ''
                        }`}
                        onClick={() => row.black?.banIndex !== undefined && handleMoveClick(row.black.banIndex)}
                        data-move-index={row.black.banIndex}
                      >
                        {row.black.ban}
                      </span>
                    )}
                    {row.black.ban && row.black.move && ' '}
                    {row.black.move && (
                      <span 
                        className={`cursor-pointer hover:bg-blue-500/20 px-1 rounded ${
                          selectedIndex === row.black.moveIndex ? 'bg-blue-500/30' : ''
                        }`}
                        onClick={() => row.black?.moveIndex !== undefined && handleMoveClick(row.black.moveIndex)}
                        data-move-index={row.black.moveIndex}
                      >
                        {row.black.move}
                      </span>
                    )}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
