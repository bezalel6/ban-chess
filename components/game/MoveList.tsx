'use client';

import type { HistoryEntry } from '@/lib/game-types';

interface MoveListProps {
  history: HistoryEntry[] | string[];
}

export default function MoveList({ history }: MoveListProps) {
  // Group moves with their preceding bans
  interface MoveWithBan {
    move: string;
    ban?: string;
  }
  
  const movesWithBans: MoveWithBan[] = [];
  
  // Handle both object format (from ban-chess.ts) and string format
  if (history.length > 0 && typeof history[0] === 'object') {
    // New format: array of HistoryEntry objects
    const entries = history as HistoryEntry[];
    let currentBan: string | undefined;
    
    entries.forEach((entry) => {
      if (entry.actionType === 'ban') {
        // Format ban as "×e2-e4" (× indicates banned)
        currentBan = `×${entry.action.from}-${entry.action.to}`;
      } else if (entry.actionType === 'move') {
        // Use SAN notation if available, otherwise construct from action
        const moveText = entry.san || `${entry.action.from}-${entry.action.to}`;
        movesWithBans.push({ move: moveText, ban: currentBan });
        currentBan = undefined; // Reset after using
      }
    });
  } else {
    // Legacy format: array of strings - no bans to show
    (history as string[]).forEach(move => {
      movesWithBans.push({ move });
    });
  }
  
  // Group moves into pairs of [white, black]
  const movePairs: [MoveWithBan | null, MoveWithBan | null][] = [];
  for (let i = 0; i < movesWithBans.length; i += 2) {
    movePairs.push([movesWithBans[i] || null, movesWithBans[i + 1] || null]);
  }

  return (
    <div className="bg-background-tertiary rounded-lg p-2 h-full overflow-y-auto">
      <table className="w-full text-xs text-center">
        <tbody>
          {movePairs.map((pair, index) => (
            <tr key={index} className="hover:bg-background-secondary h-7">
              <td className="px-1 py-0.5 text-foreground-muted font-medium align-top">{index + 1}.</td>
              <td className="px-1 py-0.5 text-left align-top">
                {pair[0] && (
                  <div>
                    {pair[0].ban && (
                      <span className="text-red-500 text-[10px] block">{pair[0].ban}</span>
                    )}
                    <span className="text-foreground">{pair[0].move}</span>
                  </div>
                )}
              </td>
              <td className="px-1 py-0.5 text-left align-top">
                {pair[1] && (
                  <div>
                    {pair[1].ban && (
                      <span className="text-red-500 text-[10px] block">{pair[1].ban}</span>
                    )}
                    <span className="text-foreground">{pair[1].move}</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
