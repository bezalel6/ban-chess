'use client';

import { useEffect, useRef } from 'react';
import type { HistoryEntry } from '@/lib/game-types';

interface MoveListProps {
  history: HistoryEntry[] | string[];
}

export default function MoveList({ history }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);
  // Process history entries to create display rows
  interface DisplayRow {
    white?: { ban?: string; move?: string };
    black?: { ban?: string; move?: string };
  }
  
  const rows: DisplayRow[] = [];
  let currentRow: DisplayRow = {};
  let moveCount = 0;
  
  // Handle both object format (from ban-chess.ts) and string format
  if (history.length > 0 && typeof history[0] === 'object') {
    // New format: array of HistoryEntry objects
    const entries = history as HistoryEntry[];
    let pendingBan: string | undefined;
    
    entries.forEach((entry) => {
      const isWhiteTurn = moveCount % 2 === 0;
      
      if (entry.actionType === 'ban') {
        // Format ban as "e2-e4"
        pendingBan = `${entry.action.from}-${entry.action.to}`;
        
        // Add ban to current position
        if (isWhiteTurn) {
          currentRow.white = { ban: pendingBan };
        } else {
          currentRow.black = { ban: pendingBan };
        }
      } else if (entry.actionType === 'move') {
        // Use SAN notation if available
        const moveText = entry.san || `${entry.action.from}${entry.action.to}`;
        
        // Add move to the existing ban entry or create new
        if (isWhiteTurn) {
          if (!currentRow.white) currentRow.white = {};
          currentRow.white.move = moveText;
        } else {
          if (!currentRow.black) currentRow.black = {};
          currentRow.black.move = moveText;
          // Complete row for black, push and reset
          rows.push(currentRow);
          currentRow = {};
        }
        
        moveCount++;
        pendingBan = undefined;
      }
    });
    
    // Push incomplete row if exists
    if (currentRow.white || currentRow.black) {
      rows.push(currentRow);
    }
  } else {
    // Legacy format: array of strings - no bans to show
    (history as string[]).forEach((move, i) => {
      if (i % 2 === 0) {
        currentRow.white = { move };
      } else {
        currentRow.black = { move };
        rows.push(currentRow);
        currentRow = {};
      }
    });
    if (currentRow.white) {
      rows.push(currentRow);
    }
  }

  return (
    <div ref={scrollRef} className="bg-background-tertiary rounded-lg p-2 h-full overflow-y-auto">
      <table className="w-full text-xs text-center">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-background-secondary h-7">
              <td className="px-1 py-0.5 text-foreground-muted font-medium align-middle">{index + 1}.</td>
              <td className="px-1 py-0.5 text-left align-middle">
                {row.white && (
                  <span className="text-foreground">
                    {row.white.ban && <span className="text-red-500">{row.white.ban} </span>}
                    {row.white.move && <span>{row.white.move}</span>}
                  </span>
                )}
              </td>
              <td className="px-1 py-0.5 text-left align-middle">
                {row.black && (
                  <span className="text-foreground">
                    {row.black.ban && <span className="text-red-500">{row.black.ban} </span>}
                    {row.black.move && <span>{row.black.move}</span>}
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
