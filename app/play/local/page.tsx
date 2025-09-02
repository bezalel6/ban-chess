'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import { useOfflineGame } from '@/hooks/useOfflineGame';
import { Wifi, WifiOff } from 'lucide-react';

export default function PlayLocalPage() {
  const [selectedMode, setSelectedMode] = useState<'online' | 'offline' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const { connected, createSoloGame } = useGameState();
  const { createOfflineGame } = useOfflineGame();
  const router = useRouter();

  // Auto-create online solo game if in creating state and connected
  useEffect(() => {
    if (selectedMode === 'online' && isCreating && connected) {
      createSoloGame();
    }
  }, [selectedMode, isCreating, connected, createSoloGame]);

  const handleOnlineMode = () => {
    setSelectedMode('online');
    setIsCreating(true);
  };

  const handleOfflineMode = () => {
    setSelectedMode('offline');
    setIsCreating(true);
    
    // Navigate to the offline game page - the game will be created there
    const offlineGameId = `offline-${Date.now()}`;
    router.push(`/game/${offlineGameId}?mode=offline`);
  };

  // Show loading state when creating
  if (isCreating) {
    const message = selectedMode === 'online' 
      ? (connected ? 'Creating online solo game...' : 'Connecting to server...')
      : 'Creating offline game...';
      
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">
            {selectedMode === 'online' ? 'Online Solo Game' : 'Offline Game'}
          </h2>
          <p className="text-foreground-muted">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Game Mode</h1>
          <p className="text-foreground-muted">
            Select how you'd like to play your solo practice game
          </p>
        </div>

        <div className="space-y-4">
          {/* Online Mode */}
          <button
            onClick={handleOnlineMode}
            disabled={!connected}
            className="w-full p-6 rounded-lg border-2 border-border hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-background-secondary hover:bg-background-tertiary"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold mb-1">Online Solo Game</h3>
                <p className="text-sm text-foreground-muted">
                  Server-managed game (current behavior)
                  <br />
                  <span className="text-xs">
                    Uses server for validation, testing, and debugging
                  </span>
                </p>
                {!connected && (
                  <p className="text-xs text-destructive mt-1">
                    Server connection required
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Offline Mode */}
          <button
            onClick={handleOfflineMode}
            className="w-full p-6 rounded-lg border-2 border-border hover:border-primary transition-colors bg-background-secondary hover:bg-background-tertiary"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <WifiOff className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold mb-1">Offline Game</h3>
                <p className="text-sm text-foreground-muted">
                  Pure local game using ban-chess.ts
                  <br />
                  <span className="text-xs">
                    No server required, fully offline gameplay
                  </span>
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-foreground-muted">
            Both modes support the full 2ban-2chess experience.
            <br />
            Online mode is useful for testing server features.
          </p>
        </div>
      </div>
    </div>
  );
}