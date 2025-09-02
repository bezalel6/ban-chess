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
  rating?: number;
  isOnline?: boolean;
}

export default function PlayerInfo({ username, isTurn, clock, isClockActive = false, canGiveTime = false, onGiveTime, rating, isOnline = true }: PlayerInfoProps) {
  const { formattedTime, isLowTime, isCritical } = useGameTimer({
    clock,
    isActive: isClockActive,
  });

  // Determine clock styling based on time remaining
  const getClockClassName = () => {
    let baseClass = "font-mono text-xl px-3 py-1 rounded-md transition-all duration-200";
    
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
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className={`font-medium text-base ${isTurn ? 'text-white' : 'text-gray-300'}`}>
            {username}
          </span>
          {rating && (
            <span className="text-sm text-gray-400">
              {rating}
            </span>
          )}
        </div>
        {canGiveTime && onGiveTime && (
          <button
            onClick={onGiveTime}
            className="p-1 rounded bg-blue-600 hover:bg-blue-500 transition-colors"
            title="Give 15 seconds to opponent"
            aria-label="Give time to opponent"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      <div className={getClockClassName()}>
        {clock ? formattedTime : '5:00'}
      </div>
      {isTurn && (
        <div className="w-full h-0.5 bg-green-500 mt-1 rounded-full"></div>
      )}
    </div>
  );
}
