// Move history component - currently not used
// Will be reimplemented when we add move history tracking

interface MoveHistoryProps {
  fen?: string;
}

export default function MoveHistory({ fen: _fen }: MoveHistoryProps) {
  return (
    <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
      <div className="text-sm font-medium text-gray-400 mb-2">
        Moves
      </div>
      <div className="flex-1 bg-slate-800/30 rounded-lg p-3 overflow-y-auto">
        <p className="text-sm text-gray-500">Move history coming soon</p>
      </div>
    </div>
  );
}