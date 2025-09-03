'use client';

import type { PlayerClock } from '@/lib/game-types';

interface StaticClockProps {
  clock?: PlayerClock;
}

export default function StaticClock({ clock }: StaticClockProps) {
  if (!clock) return null;
  
  // Format time without any ticking
  const totalSeconds = Math.floor(clock.remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let formattedTime: string;
  if (hours > 0) {
    formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Simple static display
  return (
    <div className="font-mono text-xl px-3 py-1 rounded-md bg-background-tertiary">
      {formattedTime}
    </div>
  );
}