'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const timeControls = [
  { id: '1+0', time: 1, increment: 0, type: 'Bullet', icon: Zap, color: 'text-yellow-500' },
  { id: '3+0', time: 3, increment: 0, type: 'Blitz', icon: Clock, color: 'text-orange-500' },
  { id: '5+3', time: 5, increment: 3, type: 'Blitz', icon: Clock, color: 'text-orange-500' },
  { id: '10+0', time: 10, increment: 0, type: 'Rapid', icon: Crown, color: 'text-green-500' },
  { id: '15+10', time: 15, increment: 10, type: 'Rapid', icon: Crown, color: 'text-blue-500' },
  { id: '30+0', time: 30, increment: 0, type: 'Classical', icon: Crown, color: 'text-blue-500' },
];

export default function QuickPairing() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedControl, setSelectedControl] = useState('5+3');

  const handlePlay = () => {
    if (user) {
      // Navigate to the dedicated play page to join the queue
      router.push('/play/online');
    } else {
      // If user is not logged in, redirect to sign-in
      router.push('/auth/signin');
    }
  };

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
              className={`p-4 rounded-lg border-2 transition-all hover:border-lichess-orange-500 ${
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
        className="w-full py-4 rounded-lg font-medium transition-colors bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white"
      >
        Play
      </button>
    </div>
  );
}