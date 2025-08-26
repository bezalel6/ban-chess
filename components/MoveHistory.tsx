import type { HistoryEntry } from '@/lib/game-types';

interface MoveHistoryProps {
  history: HistoryEntry[];
}

export default function MoveHistory({ history }: MoveHistoryProps) {
  return (
    <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
      <div className="text-sm font-medium text-gray-400 mb-2">
        Moves
      </div>
      <div className="flex-1 bg-slate-800/30 rounded-lg p-3 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No moves yet</p>
        ) : (
          <div className="space-y-1">
            {history.map((entry, idx) => (
              <HistoryItem key={idx} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="text-sm flex gap-2">
      <span className="text-gray-500 font-mono">
        {entry.turnNumber}.
      </span>
      <span className="text-gray-300">
        {entry.player === "white" ? "White" : "Black"}
      </span>
      {entry.actionType === "ban" ? (
        <span className="text-red-400 font-medium">
          banned {entry.action.from}-{entry.action.to}
        </span>
      ) : (
        <span className="text-white">
          {entry.san || `${entry.action.from}-${entry.action.to}`}
        </span>
      )}
    </div>
  );
}