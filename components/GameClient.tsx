'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import type { Move, Ban } from '@/lib/game-types';
import GameSidebar from './game/GameSidebar';
import GameStatusPanel from './game/GameStatusPanel';

const ResizableBoard = dynamic(() => import('@/components/game/ResizableBoard'), {
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
    <div className="flex gap-4 max-w-[1800px] mx-auto p-4 min-h-screen">
      {/* Left Panel - Game Status and Chat */}
      <div className="hidden md:block flex-shrink-0 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
      </div>
      
      {/* Center - Resizable Chess Board */}
      <div className="flex-1 flex items-start justify-center">
        <ResizableBoard
          gameState={gameState}
          onMove={handleMove}
          onBan={handleBan}
          playerColor={gameState.playerColor}
        />
      </div>
      
      {/* Right Panel - Players and Move History */}
      <div className="hidden md:block flex-shrink-0 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <GameSidebar gameState={gameState} />
      </div>

      {/* Mobile: Stack panels below board */}
      <div className="md:hidden flex flex-col gap-4">
        <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
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