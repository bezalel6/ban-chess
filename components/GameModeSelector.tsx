'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useQueue } from '@/lib/ws-hooks-optimized';

export default function GameModeSelector() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<'none' | 'solo' | 'queue'>('none');
  
  const { position, matched, error, connected, authenticated, joinQueue, leaveQueue, ws } = 
    useQueue(user && user.userId && user.username 
      ? { userId: user.userId, username: user.username } 
      : undefined);

  useEffect(() => {
    if (matched) {
      // Redirect to game when matched
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  const handleCreateSoloGame = () => {
    if (!user || !ws || !connected || !authenticated) {
      return;
    }
    
    setMode('solo');
    
    // Send create-solo-game message
    ws.send(JSON.stringify({ type: 'create-solo-game' }));
    
    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'solo-game-created') {
        // Redirect to the solo game
        router.push(`/game/${msg.gameId}`);
        ws.removeEventListener('message', handleMessage);
      }
    };
    
    ws.addEventListener('message', handleMessage);
  };

  const handleJoinQueue = () => {
    if (!user) {
      return;
    }
    setMode('queue');
    joinQueue();
  };

  const handleCancel = () => {
    if (mode === 'queue') {
      leaveQueue();
    }
    setMode('none');
  };

  const inQueue = position !== null;

  if (mode === 'solo') {
    return (
      <div className="mb-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Creating Solo Game...
          </h2>
          <div className="loading-spinner mb-4" />
          <p className="text-lg text-gray-300">
            Setting up your practice game
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'queue' || inQueue) {
    return (
      <div className="mb-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Finding Opponent...
          </h2>
          <div className="mb-6">
            <div className="loading-spinner mb-4" />
            <p className="text-lg text-gray-300">
              Position in queue: <span className="font-bold text-white">{position}</span>
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
          >
            Leave Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-6">
          Choose Game Mode
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Solo Play Button */}
          <button
            onClick={handleCreateSoloGame}
            disabled={!user || !connected || !authenticated}
            className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-xl font-semibold mb-2">Play Solo</div>
            <div className="text-sm text-purple-100">
              Practice by playing both sides
            </div>
          </button>
          
          {/* Multiplayer Button */}
          <button
            onClick={handleJoinQueue}
            disabled={!user || !connected || !authenticated}
            className="p-6 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <div className="text-3xl mb-2">⚔️</div>
            <div className="text-xl font-semibold mb-2">Play Online</div>
            <div className="text-sm text-green-100">
              Challenge another player
            </div>
          </button>
        </div>
        
        {!user && (
          <p className="text-sm text-gray-500 mt-6">
            Please set your username to start playing
          </p>
        )}
        
        {user && (!connected || !authenticated) && (
          <p className="text-sm text-gray-500 mt-6">
            {!connected ? "Connecting to server..." : "Authenticating..."}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}