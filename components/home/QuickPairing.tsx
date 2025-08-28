'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useWebSocket } from '@/lib/ws-hooks';

const timeControls = [
  { id: '1+0', time: 1, increment: 0, type: 'Bullet', icon: Zap, color: 'text-yellow-500' },
  { id: '3+0', time: 3, increment: 0, type: 'Blitz', icon: Clock, color: 'text-orange-500' },
  { id: '5+3', time: 5, increment: 3, type: 'Blitz', icon: Clock, color: 'text-orange-500' },
  { id: '10+0', time: 10, increment: 0, type: 'Rapid', icon: Crown, color: 'text-green-500' },
  { id: '15+10', time: 15, increment: 10, type: 'Rapid', icon: Crown, color: 'text-green-500' },
  { id: '30+0', time: 30, increment: 0, type: 'Classical', icon: Crown, color: 'text-blue-500' },
];

export default function QuickPairing() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedControl, setSelectedControl] = useState('5+3');
  const { 
    authenticated, 
    matched, 
    position, 
    joinQueue, 
    leaveQueue 
  } = useWebSocket(undefined, user && user.userId && user.username ? { userId: user.userId, username: user.username } : undefined);

  const isSearching = position !== null;

  useEffect(() => {
    if (matched) {
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  const handlePlay = () => {
    if (isSearching) {
      leaveQueue();
    } else {
      joinQueue();
    }
  };

  if (!authenticated) {
    return (
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="text-center text-foreground-muted">
          <div className="loading-spinner mb-4"></div>
          <p>Connecting to game server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-secondary rounded-lg p-6 shadow-lg">
      <h2 className="text-card-title font-semibold mb-6 text-foreground">Quick pairing</h2>
      
      {/* Time Control Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {timeControls.map((control) => {
          const Icon = control.icon;
          return (
            <button
              key={control.id}
              onClick={() => setSelectedControl(control.id)}
              disabled={isSearching}
              className={`p-4 rounded-lg border-2 transition-all hover:border-lichess-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedControl === control.id
                  ? 'border-lichess-orange-500 bg-lichess-orange-500/10'
                  : 'border-border bg-background-tertiary hover:bg-background-secondary'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <Icon className={`h-5 w-5 ${control.color}`} />
              </div>
              <div className="text-sm font-medium text-foreground">
                {control.time}+{control.increment}
              </div>
              <div className="text-xs text-foreground-muted">
                {control.type}
              </div>
            </button>
          );
        })}
      </div>

      {/* Play Button */}
      <button
        onClick={handlePlay}
        className={`w-full py-4 rounded-lg font-medium transition-colors ${
          isSearching
            ? 'bg-destructive-500 hover:bg-destructive-600 text-white'
            : 'bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white'
        }`}
      >
        {isSearching ? 'Cancel' : 'Play'}
      </button>

      {isSearching && (
        <div className="mt-4 text-center">
          <div className="loading-spinner mb-2" />
          <p className="text-sm text-foreground-muted">
            Searching for opponent... (Position: {position})
          </p>
        </div>
      )}
    </div>
  );
}