'use client';

import type { HistoryEntry } from '@/lib/game-types';

interface MoveListProps {
  history: HistoryEntry[] | string[];
}

export default function MoveList({ history }: MoveListProps) {
  // Convert history to display format
  const displayItems: string[] = [];
  
  // Handle both object format (from ban-chess.ts) and string format
  if (history.length > 0 && typeof history[0] === 'object') {
    // New format: array of HistoryEntry objects
    (history as HistoryEntry[]).forEach((entry) => {
      if (entry.actionType === 'move') {
        // Use SAN notation if available, otherwise construct from action
        const moveText = entry.san || `${entry.action.from}-${entry.action.to}`;
        displayItems.push(moveText);
      }
      // Skip ban entries for display (they're not traditional moves)
    });
  } else {
    // Legacy format: array of strings
    displayItems.push(...(history as string[]));
  }
  
  // Group moves into pairs of [white, black]
  const movePairs: [string, string | null][] = [];
  for (let i = 0; i < displayItems.length; i += 2) {
    movePairs.push([displayItems[i], displayItems[i + 1] || null]);
  }

  return (
    <div className="bg-background-tertiary rounded-lg p-2 flex-grow overflow-y-auto">
      <table className="w-full text-sm text-center">
        <tbody>
          {movePairs.map((pair, index) => (
            <tr key={index} className="hover:bg-background-secondary">
              <td className="px-2 py-1 text-foreground-muted font-medium">{index + 1}.</td>
              <td className="px-2 py-1 text-foreground text-left">{pair[0]}</td>
              <td className="px-2 py-1 text-foreground text-left">{pair[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
