'use client';

import dynamic from 'next/dynamic';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { SessionData } from '@/lib/auth-unified';
import { parseFEN } from '@/lib/game-types';
import type { Move, Ban } from '@/lib/game-types';
import { useState } from 'react';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
  loading: () => <div className="aspect-square bg-background-secondary rounded animate-pulse" />,
});

interface GameClientProps {
  gameId: string;
  user: SessionData | null;
}

export default function GameClient({ gameId, user }: GameClientProps) {
  const [showDebug, setShowDebug] = useState(true);
  const { 
    gameState, 
    error, 
    connected, 
    sendAction 
  } = useWebSocket();

  const handleMove = (move: Move) => {
    console.log('[GameClient] Sending move:', move);
    sendAction({ move });
  };

  const handleBan = (ban: Ban) => {
    console.log('[GameClient] Sending ban:', ban);
    sendAction({ ban });
  };

  // Show loading state
  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  // Show waiting for game state
  if (!gameState || gameState.gameId !== gameId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Joining game...</p>
        </div>
      </div>
    );
  }

  const fenData = parseFEN(gameState.fen);
  const isGameOver = gameState.fen.includes('#');
  const nextAction = gameState.nextAction || 'move';
  const legalActionCount = gameState.legalActions?.length || 0;

  return (
    <div className="space-y-4">
      {/* Debug Panel */}
      <div className="bg-background-secondary p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Debug Info</h3>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs px-2 py-1 bg-background rounded hover:bg-background-tertiary"
          >
            {showDebug ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showDebug && (
          <div className="space-y-2 text-sm font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-foreground-muted">Game ID:</span>
                <div className="text-xs break-all">{gameId}</div>
              </div>
              <div>
                <span className="text-foreground-muted">Solo Game:</span>
                <div>{gameState.isSoloGame ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-foreground-muted">Current Turn:</span>
                <div className={fenData.turn === 'white' ? 'text-white' : 'text-gray-400'}>
                  {fenData.turn === 'white' ? '⚪ White' : '⚫ Black'}
                </div>
              </div>
              <div>
                <span className="text-foreground-muted">Next Action:</span>
                <div className={nextAction === 'ban' ? 'text-warning' : 'text-primary'}>
                  {nextAction === 'ban' ? '🚫 Ban Phase' : '♟️ Move Phase'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-foreground-muted">Your Color:</span>
                <div>{gameState.playerColor || 'Not assigned'}</div>
              </div>
              <div>
                <span className="text-foreground-muted">Legal Actions:</span>
                <div className={legalActionCount > 0 ? 'text-success' : 'text-destructive'}>
                  {legalActionCount} available
                </div>
              </div>
            </div>

            <div>
              <span className="text-foreground-muted">FEN:</span>
              <div className="text-xs break-all mt-1 p-2 bg-background rounded">
                {gameState.fen}
              </div>
            </div>

            {gameState.legalActions && gameState.legalActions.length > 0 && (
              <div>
                <span className="text-foreground-muted">Legal Actions (first 10):</span>
                <div className="text-xs mt-1 p-2 bg-background rounded">
                  {gameState.legalActions.slice(0, 10).join(', ')}
                  {gameState.legalActions.length > 10 && ` ... +${gameState.legalActions.length - 10} more`}
                </div>
              </div>
            )}

            <div>
              <span className="text-foreground-muted">Ban State:</span>
              <div className="text-xs">
                {fenData.banState || 'No ban info'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Status */}
      <div className="text-center space-y-2">
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

        <div className="text-lg font-semibold">
          {isGameOver ? (
            <span className="text-destructive">Game Over - Checkmate!</span>
          ) : nextAction === 'ban' ? (
            <div>
              <span className="text-warning">Ban Phase</span>
              <div className="text-sm text-foreground-muted">
                {fenData.turn === 'white' ? 'Black' : 'White'} is banning a {fenData.turn === 'white' ? 'White' : 'Black'} move
              </div>
            </div>
          ) : (
            <div>
              <span>{fenData.turn === 'white' ? '⚪ White' : '⚫ Black'} to move</span>
              {legalActionCount === 0 && (
                <div className="text-sm text-destructive">No legal moves available!</div>
              )}
            </div>
          )}
        </div>
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

      {/* Action Buttons */}
      <div className="text-center space-y-2">
        <button
          onClick={() => {
            const url = window.location.href.replace("?create=true", "");
            navigator.clipboard.writeText(url);
            alert('Game link copied!');
          }}
          className="text-sm px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90"
        >
          Copy Game Link
        </button>
        
        {/* Refresh button for debugging */}
        <button
          onClick={() => window.location.reload()}
          className="text-sm px-4 py-2 bg-background-secondary text-foreground rounded hover:opacity-90 ml-2"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}