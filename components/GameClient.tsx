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
    <>
      {/* Desktop Layout - Three column layout with centered board */}
      <div className="hidden md:flex min-h-screen justify-center items-start p-4">
        <div className="grid grid-cols-[18rem_1fr_18rem] gap-4 max-w-[1600px] w-full">
          {/* Left Panel - Fixed width */}
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
            <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
          </div>
          
          {/* Center - Board */}
          <div className="flex justify-center">
            <ResizableBoard
              gameState={gameState}
              onMove={handleMove}
              onBan={handleBan}
              playerColor={gameState.playerColor}
            />
          </div>
          
          {/* Right Panel - Fixed width, vertically centered */}
          <div className="flex items-center justify-center">
            <GameSidebar gameState={gameState} />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col gap-4 p-4">
        <ResizableBoard
          gameState={gameState}
          onMove={handleMove}
          onBan={handleBan}
          playerColor={gameState.playerColor}
        />
        <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
        <GameSidebar gameState={gameState} />
      </div>
    </>
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