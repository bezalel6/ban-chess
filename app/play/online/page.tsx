'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useGameState } from '@/hooks/useGameState';

export default function OnlinePlayPage() {
  const { user } = useAuth();
  const { connected, joinQueue, leaveQueue } = useGameState();

  useEffect(() => {
    if (!connected) return;

    // Join matchmaking queue immediately when connected
    // The useGameState hook will handle the redirect when matched
    joinQueue();

    // Leave queue when component unmounts
    return () => {
      leaveQueue();
    };
  }, [connected, joinQueue, leaveQueue]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-foreground-muted">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-hero font-bold text-foreground mb-6">
            Finding a Match
          </h1>
          <p className="text-lg text-foreground-muted mb-8">
            Please wait while we connect you with another player.
          </p>
          
          <div className="bg-background-secondary rounded-lg p-6 border border-border">
            <div className="loading-spinner mb-4"></div>
            <p className="text-foreground">
              {connected ? 'In queue for an online game...' : 'Connecting to server...'}
            </p>
            <p className="text-foreground-subtle text-sm mt-2">
              You will be automatically redirected when a match is found.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
