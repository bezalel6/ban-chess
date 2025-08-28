'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useWebSocket } from '@/lib/ws-hooks';

export default function SoloPlayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    authenticated, 
    matched, 
    createSoloGame 
  } = useWebSocket(undefined, user && user.userId && user.username ? { userId: user.userId, username: user.username } : undefined);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (matched) {
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  useEffect(() => {
    if (authenticated && user) {
      // Automatically create a solo game when authenticated
      createSoloGame();
    }
  }, [authenticated, user, createSoloGame]);

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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-foreground-muted">Connecting to game server...</p>
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
            <p className="text-foreground">Creating your solo game...</p>
            <p className="text-foreground-subtle text-sm mt-2">
              You&apos;ll be redirected to the game board momentarily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}