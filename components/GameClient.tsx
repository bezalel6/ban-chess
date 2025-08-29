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
  const [debugMode, setDebugMode] = useState(false);
  const router = useRouter();
  
  // Check for debug mode in URL or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug') === 'true';
    const debugStorage = localStorage.getItem('debugMode') === 'true';
    setDebugMode(debugParam || debugStorage);
  }, []);
  
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
      <div className={`hidden md:flex h-screen justify-center items-start p-4 ${debugMode ? 'border-4 border-red-500 relative' : ''}`}>
        {debugMode && <div className="absolute top-0 left-0 bg-red-500 text-white p-2 z-50">OUTER CONTAINER</div>}
        <div className={`grid grid-cols-[18rem_auto_18rem] gap-4 ${debugMode ? 'border-4 border-blue-500 relative' : ''}`}>
          {debugMode && <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-2 z-50">GRID CONTAINER</div>}
          
          {/* Left Panel - Fixed width */}
          <div className={`max-h-[calc(100vh-2rem)] overflow-y-auto ${debugMode ? 'border-4 border-green-500 relative' : ''}`}>
            {debugMode && <div className="absolute top-0 left-0 bg-green-500 text-white p-1 z-50">LEFT</div>}
            <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
          </div>
          
          {/* Center - Board */}
          <div className={`flex justify-center ${debugMode ? 'border-4 border-yellow-500 relative' : ''}`}>
            {debugMode && <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-500 text-black p-1 z-50">CENTER</div>}
            <ResizableBoard
              gameState={gameState}
              onMove={handleMove}
              onBan={handleBan}
              playerColor={gameState.playerColor}
            />
          </div>
          
          {/* Right Panel - Fixed width, vertically centered */}
          <div className={`flex items-center justify-center ${debugMode ? 'border-4 border-purple-500 relative' : ''}`}>
            {debugMode && <div className="absolute top-0 right-0 bg-purple-500 text-white p-1 z-50">RIGHT</div>}
            <GameSidebar gameState={gameState} />
          </div>
        </div>
        
        {/* Debug toggle button */}
        <button
          onClick={() => {
            const newDebugMode = !debugMode;
            setDebugMode(newDebugMode);
            localStorage.setItem('debugMode', newDebugMode.toString());
          }}
          className="fixed bottom-4 right-4 p-2 bg-background-secondary rounded-lg text-xs opacity-50 hover:opacity-100 transition-opacity"
        >
          {debugMode ? 'Hide' : 'Show'} Debug
        </button>
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