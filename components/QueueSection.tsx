'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useQueue } from '@/lib/ws-hooks-optimized';

export default function QueueSection() {
  const router = useRouter();
  const { user } = useAuth();
  const { position, matched, error, connected, authenticated, joinQueue, leaveQueue } = 
    useQueue(user && user.userId && user.username 
      ? { userId: user.userId, username: user.username } 
      : undefined);

  useEffect(() => {
    if (matched) {
      // Redirect to game when matched
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  const handleJoinQueue = () => {
    if (!user) {
      return;
    }
    joinQueue();
  };

  const inQueue = position !== null;

  return (
    <div className="mb-8">
      {!inQueue ? (
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Ready to Play?
          </h2>
          <button
            onClick={handleJoinQueue}
            disabled={!user || !connected || !authenticated}
            className="px-12 py-4 text-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            {!user ? "Login Required" : 
             !connected ? "Connecting..." :
             !authenticated ? "Authenticating..." :
             "Join Queue"}
          </button>
          {!user && (
            <p className="text-sm text-gray-500 mt-4">
              Please set your username to start playing
            </p>
          )}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Finding Opponent...
          </h2>
          <div className="mb-6">
            <div className="loading-spinner mb-4" />
            <p className="text-lg text-gray-300">
              Position in queue: <span className="font-bold text-white">{position}</span>
            </p>
            {matched && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 font-semibold">
                  Matched! Playing as {matched.color}
                  {matched.opponent && ` against ${matched.opponent}`}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={leaveQueue}
            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
          >
            Leave Queue
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}