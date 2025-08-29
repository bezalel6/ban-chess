'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import type { Move, Ban } from '@/lib/game-types';
import GameSidebar from './game/GameSidebar';
import GameStatusPanel from './game/GameStatusPanel';

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
  const router = useRouter();
  
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
  const handleNewGame = () => router.push('/');

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
    <div className="grid grid-cols-12 gap-4 max-w-[1400px] mx-auto p-4">
      {/* Left Panel - Game Status and Chat */}
      <div className="col-span-12 md:col-span-3 order-2 md:order-1">
        <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
      </div>
      
      {/* Center - Chess Board */}
      <div className="col-span-12 md:col-span-6 order-1 md:order-2">
        <ChessBoard
          gameState={gameState}
          onMove={handleMove}
          onBan={handleBan}
          playerColor={gameState.playerColor}
        />
      </div>
      
      {/* Right Panel - Players and Move History */}
      <div className="col-span-12 md:col-span-3 order-3">
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