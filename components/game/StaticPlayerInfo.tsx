'use client';

import type { PlayerClock } from '@/lib/game-types';
import StaticClock from './StaticClock';

interface StaticPlayerInfoProps {
  username: string;
  clock?: PlayerClock;
}

export default function StaticPlayerInfo({ username, clock }: StaticPlayerInfoProps) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Clock on the left edge */}
        {clock && <StaticClock clock={clock} />}
        
        {/* Username in the center */}
        <div className="flex-1 text-center">
          <span className="font-semibold text-base">{username}</span>
        </div>
        
        {/* Empty space for balance */}
        {clock && <div className="w-[100px]" />}
      </div>
    </div>
  );
}