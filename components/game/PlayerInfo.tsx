'use client';

import { useGameTimer } from '@/hooks/useGameTimer';
import type { PlayerClock } from '@/lib/game-types';
import { Plus } from 'lucide-react';

interface PlayerInfoProps {
  username: string;
  isTurn: boolean;
  clock?: PlayerClock;
  isClockActive?: boolean;
  canGiveTime?: boolean;
  onGiveTime?: () => void;
}

export default function PlayerInfo({
  username,
  isTurn,
  clock,
  isClockActive = false,
  canGiveTime = false,
  onGiveTime,
}: PlayerInfoProps) {
  const { formattedTime, isLowTime, isCritical } = useGameTimer({
    clock,
    isActive: isClockActive,
  });

  // Determine clock styling based on time remaining
  const getClockClassName = () => {
    let baseClass =
      'font-mono text-xl px-3 py-1 rounded-md transition-all duration-200';

    if (!clock) {
      return `${baseClass} bg-background-tertiary`;
    }

    if (isClockActive) {
      if (isCritical) {
        return `${baseClass} bg-red-600 text-white animate-pulse`;
      } else if (isLowTime) {
        return `${baseClass} bg-orange-500 text-white`;
      } else {
        return `${baseClass} bg-green-600 text-white`;
      }
    }

    return `${baseClass} bg-background-tertiary`;
  };

  return (
    <div
      className={`p-3 rounded-lg ${isTurn ? 'bg-primary/20' : 'bg-transparent'}`}
    >
      <div className='flex items-center justify-between'>
        <span
          className={`font-semibold text-lg ${isTurn ? 'text-foreground' : 'text-foreground-muted'}`}
        >
          {username}
        </span>
        <div className='flex items-center gap-2'>
          <div className={getClockClassName()}>
            {clock ? formattedTime : '5:00'}
          </div>
          {canGiveTime && onGiveTime && (
            <button
              onClick={onGiveTime}
              className='p-2 rounded-md hover:bg-primary/20 transition-colors group'
              title='Give 15 seconds to opponent'
              aria-label='Give time to opponent'
            >
              <Plus className='w-4 h-4 text-foreground-muted group-hover:text-primary' />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
