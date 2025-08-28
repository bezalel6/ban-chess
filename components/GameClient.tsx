'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useWebSocket } from '@/lib/ws-hooks';
import SoundControl from '@/components/SoundControl';
import DebugPanel from '@/components/DebugPanel';
import type { SessionData } from '@/lib/auth-unified';
import { parseFEN, getNextAction, isGameOver } from '@/lib/game-types';
import type { Move, Ban } from '@/lib/game-types';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
  loading: () => <div className="chess-board-skeleton" />,
});

interface GameClientProps {
  gameId: string;
  user: SessionData | null;
}

export default function GameClient({ gameId, user }: GameClientProps) {
  const { 
    gameState, 
    error, 
    connected, 
    authenticated, 
    sendAction 
  } = useWebSocket(gameId, user ? { userId: user.userId!, username: user.username! } : undefined);
  
  const [copied, setCopied] = useState(false);

  const copyGameLink = () => {
    const url = window.location.href.replace("?create=true", "");
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle move from the board
  const handleMove = (move: Move) => {
    sendAction({ move });
  };

  // Handle ban from the board
  const handleBan = (ban: Ban) => {
    sendAction({ ban });
  };

  if (!connected || !authenticated) {
    const isProductionWithoutWS = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      !process.env.NEXT_PUBLIC_WS_URL;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="container-custom">
          <div className="game-info text-center">
            <div className="loading-spinner mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {!connected ? "Connecting to game server..." : "Authenticating..."}
            </h2>
            <p className="text-foreground-muted">Please wait while we establish a connection.</p>
            
            {isProductionWithoutWS && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-destructive font-semibold mb-2">WebSocket Server Not Configured</p>
                <p className="text-destructive/80 text-sm">
                  The game server URL is not configured for production. 
                  Please contact the administrator or check the deployment configuration.
                </p>
                <p className="text-foreground-subtle text-xs mt-2">
                  Technical: NEXT_PUBLIC_WS_URL environment variable is missing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    throw new Error(error);
  }

  if (!gameState) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center pb-20 bg-background">
          <div className="container-custom">
            <div className="game-info text-center">
              <div className="loading-spinner mb-4"></div>
              <h2 className="text-xl font-semibold text-foreground">Waiting for game state...</h2>
            </div>
          </div>
        </div>
        
        {/* Debug Panel even without game state */}
        <DebugPanel 
          gameState={null}
          connected={connected}
          authenticated={authenticated}
          error={error}
        />
      </>
    );
  }

  // Parse FEN to get game info
  const fenData = parseFEN(gameState.fen);
  const nextAction = getNextAction(gameState.fen);
  const gameOver = isGameOver(gameState.fen);

  return (
    <>
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-[1600px] mx-auto">
          {/* Lichess-style 3-Panel Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
            
            {/* Left Panel - Chess Board */}
            <div className="xl:col-span-3 flex items-center justify-center">
              <div className="w-full max-w-[600px]">
                <Suspense fallback={<div className="chess-board-skeleton" />}>
                  <ChessBoard
                    gameState={gameState}
                    onMove={handleMove}
                    onBan={handleBan}
                    playerColor={gameState.isSoloGame ? "white" : gameState.playerColor}
                  />
                </Suspense>
              </div>
            </div>

            {/* Right Panel - Game Info */}
            <div className="xl:col-span-1 flex flex-col space-y-4">
              
              {/* Top Player Card (Black) */}
              <PlayerCard
                color="black"
                username={gameState.players?.black || "Waiting..."}
                rating="1500" // Placeholder rating
                isActive={!gameOver && fenData.turn === 'black'}
                timeLeft="10:00" // Placeholder time
                materialAdvantage={0} // Placeholder
              />

              {/* Move List Panel */}
              <div className="bg-background-secondary rounded-lg border border-border flex-1 min-h-[400px] flex flex-col">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Move List</span>
                  <span className="text-xs text-foreground-muted">
                    Game #{gameState.gameId.slice(0, 8)}
                  </span>
                </div>
                
                <div className="flex-1 overflow-auto p-3">
                  <MoveList moves={[]} currentMove={fenData.fullMove} />
                </div>

                {/* Game Status Bar */}
                <div className="p-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm px-2 py-1 rounded ${
                      gameOver 
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-lichess-green/20 text-lichess-green'
                    }`}>
                      {gameOver ? 'Game Over' : 'Active'}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Move {fenData.fullMove}
                    </span>
                  </div>
                  
                  {!gameOver && (
                    <div className="text-center">
                      <p className="text-sm text-foreground mb-1">
                        <span className="font-semibold">
                          {fenData.turn === 'white' ? 'White' : 'Black'}
                        </span>{' '}
                        to {nextAction}
                      </p>
                      {fenData.banState && !fenData.banState.includes(':ban') && (
                        <p className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                          ⚠ Banned: {fenData.banState.split(':')[1]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Player Card (White) */}
              <PlayerCard
                color="white"
                username={gameState.players?.white || "Waiting..."}
                rating="1500" // Placeholder rating
                isActive={!gameOver && fenData.turn === 'white'}
                timeLeft="10:00" // Placeholder time
                materialAdvantage={0} // Placeholder
              />

              {/* Game Controls */}
              <GameControls 
                onCopyLink={copyGameLink}
                copied={copied}
                gameOver={gameOver}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel 
        gameState={gameState}
        connected={connected}
        authenticated={authenticated}
        error={error}
      />
    </>
  );
}

// Lichess-style Player Card Component
function PlayerCard({
  color,
  username,
  rating,
  isActive,
  timeLeft,
  materialAdvantage
}: {
  color: 'white' | 'black';
  username: string;
  rating: string;
  isActive: boolean;
  timeLeft: string;
  materialAdvantage: number;
}) {
  return (
    <div className={`bg-background-secondary rounded-lg border transition-all ${
      isActive 
        ? 'border-lichess-orange-500 bg-lichess-orange-500/10' 
        : 'border-border'
    }`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Player Avatar Placeholder */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              color === 'white' 
                ? 'bg-white text-black' 
                : 'bg-foreground text-background'
            }`}>
              {username.charAt(0).toUpperCase()}
            </div>
            
            {/* Player Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {username}
                </span>
                {isActive && (
                  <div className="w-2 h-2 bg-lichess-green rounded-full animate-pulse" />
                )}
              </div>
              <div className="text-xs text-foreground-muted">
                Rating: {rating}
              </div>
            </div>
          </div>

          {/* Clock */}
          <div className={`px-2 py-1 rounded text-sm font-mono ${
            isActive 
              ? 'bg-lichess-orange-500 text-white' 
              : 'bg-background-tertiary text-foreground-muted'
          }`}>
            {timeLeft}
          </div>
        </div>

        {/* Material Advantage */}
        {materialAdvantage !== 0 && (
          <div className="flex justify-end">
            <span className={`text-xs px-2 py-1 rounded ${
              materialAdvantage > 0 
                ? 'bg-lichess-green/20 text-lichess-green' 
                : 'bg-destructive/20 text-destructive'
            }`}>
              {materialAdvantage > 0 ? '+' : ''}{materialAdvantage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Move List Component
function MoveList({
  moves,
  currentMove
}: {
  moves: Array<{ moveNumber: number; white?: string; black?: string }>;
  currentMove: number;
}) {
  // Generate placeholder moves for demonstration
  const placeholderMoves = Array.from({ length: Math.max(currentMove - 1, 0) }, (_, i) => ({
    moveNumber: i + 1,
    white: i === 0 ? 'e4' : `move${i + 1}`,
    black: i === 0 ? 'e5' : `move${i + 1}`
  }));

  const displayMoves = moves.length > 0 ? moves : placeholderMoves;

  return (
    <div className="space-y-1">
      {displayMoves.length === 0 && (
        <div className="text-center text-foreground-muted text-sm py-8">
          No moves yet
        </div>
      )}
      
      {displayMoves.map((move) => (
        <div
          key={move.moveNumber}
          className="grid grid-cols-[auto_1fr_1fr] gap-2 p-1 rounded hover:bg-background-tertiary/50 transition-colors"
        >
          {/* Move Number */}
          <span className="text-xs text-foreground-muted w-6 text-right">
            {move.moveNumber}.
          </span>
          
          {/* White Move */}
          <span className={`text-sm ${
            move.white ? 'text-foreground' : 'text-foreground-muted'
          }`}>
            {move.white || '...'}
          </span>
          
          {/* Black Move */}
          <span className={`text-sm ${
            move.black ? 'text-foreground' : 'text-foreground-muted'
          }`}>
            {move.black || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// Game Controls Component
function GameControls({
  onCopyLink,
  copied,
  gameOver
}: {
  onCopyLink: () => void;
  copied: boolean;
  gameOver: boolean;
}) {
  return (
    <div className="bg-background-secondary rounded-lg border border-border p-3">
      <div className="space-y-3">
        {/* Primary Game Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={gameOver}
            className="px-3 py-2 text-sm font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed
                     bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
          >
            Resign
          </button>
          
          <button
            disabled={gameOver}
            className="px-3 py-2 text-sm font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed
                     bg-foreground-muted/20 text-foreground-muted hover:bg-foreground-muted/30 border border-foreground-muted/30"
          >
            Draw
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            className="px-2 py-1.5 text-xs rounded transition-all
                     bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80"
          >
            ↻ Flip
          </button>
          
          <button
            className="px-2 py-1.5 text-xs rounded transition-all
                     bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80"
          >
            ⚙ Settings
          </button>
          
          <button
            onClick={onCopyLink}
            className={`px-2 py-1.5 text-xs rounded transition-all ${
              copied 
                ? "bg-lichess-green text-white" 
                : "bg-background-tertiary text-foreground-muted hover:bg-background-tertiary/80"
            }`}
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>

        {/* Sound Control */}
        <div className="pt-2 border-t border-border">
          <SoundControl />
        </div>
      </div>
    </div>
  );
}