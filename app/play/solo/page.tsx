'use client';

import { useEffect, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { GameProviderWrapper } from '@/components/GameProviderWrapper';

function SoloPlayContent() {
  const { send, connected } = useGame();
  const gameCreatedRef = useRef(false);

  useEffect(() => {
    if (!connected) return;
    
    if (gameCreatedRef.current) return;
    gameCreatedRef.current = true;

    const createSoloMsg = { type: 'create-solo-game' } as const;
    send(createSoloMsg);
  }, [connected, send]);

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
  return (
    <GameProviderWrapper>
      <SoloPlayContent />
    </GameProviderWrapper>
  );
}
