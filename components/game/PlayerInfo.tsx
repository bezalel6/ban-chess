'use client';

interface PlayerInfoProps {
  username: string;
  isTurn: boolean;
}

export default function PlayerInfo({ username, isTurn }: PlayerInfoProps) {
  return (
    <div className={`p-3 rounded-lg ${isTurn ? 'bg-primary/20' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-lg ${isTurn ? 'text-foreground' : 'text-foreground-muted'}`}>
          {username}
        </span>
        {/* Placeholder for clock */}
        <div className="font-mono text-xl bg-background-tertiary px-3 py-1 rounded-md">
          05:00
        </div>
      </div>
    </div>
  );
}
