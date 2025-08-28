'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useWebSocket } from '@/contexts/WebSocketContext';

export default function SoloPlayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, createSoloGame } = useWebSocket();

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Once connected, create the game
    if (connected) {
      createSoloGame();
    }
  }, [user, connected, createSoloGame, router]);

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
            Solo Game Mode
          </h1>
          <p className="text-lg text-foreground-muted mb-8">
            Practice Ban Chess by playing both sides. Perfect for learning the rules and testing strategies.
          </p>
          
          <div className="bg-background-secondary rounded-lg p-6 border border-border">
            <div className="loading-spinner mb-4"></div>
            <p className="text-foreground">
              {connected ? 'Creating your solo game...' : 'Connecting to server...'}
            </p>
            <p className="text-foreground-subtle text-sm mt-2">
              You&apos;ll be redirected to the game board momentarily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}