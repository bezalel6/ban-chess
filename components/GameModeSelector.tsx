'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useWebSocket } from '@/lib/ws-hooks';

export default function GameModeSelector() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<'solo' | 'multiplayer' | null>(null);
  const { 
    authenticated, 
    matched, 
    position, 
    createSoloGame, 
    joinQueue, 
    leaveQueue 
  } = useWebSocket(undefined, user && user.userId && user.username ? { userId: user.userId, username: user.username } : undefined);

  useEffect(() => {
    if (matched) {
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  const handleSoloGame = () => {
    setMode('solo');
    createSoloGame();
  };

  const handleMultiplayer = () => {
    setMode('multiplayer');
    joinQueue();
  };

  const handleCancel = () => {
    if (mode === 'multiplayer') {
      leaveQueue();
    }
    setMode(null);
  };

  if (!authenticated) {
    return (
      <div className="game-mode-selector">
        <div className="text-center text-foreground-muted">
          <div className="loading-spinner mb-4"></div>
          <p>Connecting to game server...</p>
        </div>
      </div>
    );
  }

  if (position !== null) {
    return (
      <div className="game-mode-selector">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Finding Opponent...</h3>
          <p className="text-foreground-muted mb-4">Position in queue: {position}</p>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-mode-selector">
      <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Select Game Mode</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleSoloGame}
          disabled={mode === 'solo'}
          className="p-6 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 border border-border"
        >
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Solo Game</h3>
          <p className="text-sm text-foreground-muted">
            Play both sides and practice the Ban Chess mechanics
          </p>
        </button>

        <button
          onClick={handleMultiplayer}
          disabled={mode === 'multiplayer'}
          className="p-6 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 border border-border"
        >
          <div className="text-4xl mb-3">⚔️</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Multiplayer</h3>
          <p className="text-sm text-foreground-muted">
            Challenge another player online
          </p>
        </button>
      </div>

      {mode === 'solo' && (
        <div className="mt-4 text-center text-foreground-muted">
          <div className="loading-spinner mb-2"></div>
          <p>Creating solo game...</p>
        </div>
      )}
    </div>
  );
}