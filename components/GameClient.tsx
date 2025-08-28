'use client';

import dynamic from 'next/dynamic';
import { useGameWebSocket } from '@/contexts/WebSocketContext';
import { parseFEN } from '@/lib/game-types';
import type { Move, Ban } from '@/lib/game-types';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
  loading: () => <div className="aspect-square bg-background-secondary rounded animate-pulse" />,
});

interface GameClientProps {
  gameId: string;
}

export default function GameClient({ gameId }: GameClientProps) {
  const { gameState, error, connected, sendAction } = useGameWebSocket();

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

  const fenData = parseFEN(gameState.fen);
  const isGameOver = gameState.gameOver || false;
  const nextAction = gameState.nextAction || 'move';

  return (
    <div className="space-y-4">
      {/* Players */}
      {gameState.players && (
        <div className="flex justify-center gap-4 text-sm">
          <span className={fenData.turn === 'white' ? 'font-bold' : ''}>
            ⚪ {gameState.players.white || 'Waiting...'}
          </span>
          <span className="text-foreground-muted">vs</span>
          <span className={fenData.turn === 'black' ? 'font-bold' : ''}>
            ⚫ {gameState.players.black || 'Waiting...'}
          </span>
        </div>
      )}

      {/* Game Status */}
      <div className="text-center text-lg font-semibold">
        {isGameOver ? (
          <span className="text-destructive">{gameState.result || 'Game Over'}</span>
        ) : nextAction === 'ban' ? (
          <span className="text-warning">
            {fenData.turn === 'white' ? 'Black' : 'White'} is banning
          </span>
        ) : (
          <span>{fenData.turn === 'white' ? '⚪ White' : '⚫ Black'} to move</span>
        )}
      </div>

      {/* Chess Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-[600px]">
          <ChessBoard
            gameState={gameState}
            onMove={handleMove}
            onBan={handleBan}
            playerColor={gameState.playerColor}
          />
        </div>
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