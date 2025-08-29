'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameState } from '@/hooks/useGameState';
import type { Move, Ban } from '@/lib/game-types';
import GameSidebar from './game/GameSidebar';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
  loading: () => <div className="aspect-square bg-background-secondary rounded animate-pulse" />,
});

interface GameClientProps {
  gameId: string;
}

export default function GameClient({ gameId }: GameClientProps) {
  const { gameState, error, connected, sendAction, joinGame } = useGameState();
  const [hasJoined, setHasJoined] = useState(false);
  
  // Join game when component mounts and we're connected
  useEffect(() => {
    if (connected && gameId && !hasJoined) {
      console.log('[GameClient] Joining game:', gameId);
      joinGame(gameId);
      setHasJoined(true);
    }
  }, [connected, gameId, hasJoined, joinGame]);

  const handleMove = (move: Move) => sendAction({ move });
  const handleBan = (ban: Ban) => sendAction({ ban });

  // Loading states
  if (!connected) {
    return <LoadingMessage message="Connecting..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!gameState || gameState.gameId !== gameId) {
    return <LoadingMessage message="Joining game..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
      <div className="md:col-span-2">
        <ChessBoard
          gameState={gameState}
          onMove={handleMove}
          onBan={handleBan}
          playerColor={gameState.playerColor}
        />
      </div>
      <div className="md:col-span-1">
        <GameSidebar gameState={gameState} />
      </div>
    </div>
  );
}

// Simple loading component
function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}

// Simple error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center text-destructive">
        <p>Error: {message}</p>
      </div>
    </div>
  );
}