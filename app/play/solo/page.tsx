'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/contexts/GameContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

function SoloPlayContent() {
  const gameStore = useGameStore();
  const { isReady } = useWebSocket();
  const gameCreatedRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    
    if (gameCreatedRef.current) return;
    gameCreatedRef.current = true;

    // Create a solo game
    gameStore.createSoloGame();
  }, [isReady, gameStore]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Creating Online Practice Game</h2>
        <p className="text-foreground-muted">
          Testing server game flow - play both sides online...
        </p>
      </div>
    </div>
  );
}

export default function SoloPlayPage() {
  return <SoloPlayContent />;
}