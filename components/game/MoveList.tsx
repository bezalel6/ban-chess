'use client';

interface MoveListProps {
  history: string[];
}

export default function MoveList({ history }: MoveListProps) {
  // Group moves into pairs of [white, black]
  const movePairs: [string, string | null][] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([history[i], history[i + 1] || null]);
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
