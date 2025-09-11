'use client';

import { useEffect, useRef } from 'react';
import { useGameState } from '@/hooks/useGameState';

export default function SoloPlayPage() {
  const { connected, createSoloGame } = useGameState();
  const gameCreatedRef = useRef(false);

  useEffect(() => {
    if (!connected) return;
    
    // Prevent multiple game creation
    if (gameCreatedRef.current) return;
    gameCreatedRef.current = true;

    // Create solo game immediately when connected
    // The useGameState hook will handle the redirect when it receives game-created
    createSoloGame();
  }, [connected, createSoloGame]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Creating Solo Practice Game</h2>
        <p className="text-foreground-muted">
          Setting up your tracked practice game with full features...
        </p>
      </div>
    </div>
  );
}