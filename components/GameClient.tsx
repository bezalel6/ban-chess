'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useWebSocket } from '@/lib/ws-hooks-optimized';
import SoundControl from '@/components/SoundControl';
import type { SessionData } from '@/lib/auth-unified';
import GameStatus from '@/components/GameStatus';
import MoveHistory from '@/components/MoveHistory';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
  loading: () => <div className="chess-board-skeleton" />,
});

interface GameClientProps {
  gameId: string;
  user: SessionData | null;
}

export default function GameClient({ gameId, user }: GameClientProps) {
  const { gameState, error, connected, authenticated, sendMove, sendBan } =
    useWebSocket(gameId, user ? { userId: user.userId!, username: user.username! } : undefined);
  const [copied, setCopied] = useState(false);

  const copyGameLink = () => {
    const url = window.location.href.replace("?create=true", "");
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container-custom">
          <div className="game-info text-center">
            <div className="loading-spinner mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {!connected ? "Connecting to game server..." : "Authenticating..."}
            </h2>
            <p className="text-gray-400">Please wait while we establish a connection.</p>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="container-custom">
          <div className="game-info text-center">
            <div className="loading-spinner mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Waiting for game state...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] flex gap-6">
        {/* Left Column - Chess Board */}
        <div className="flex-[7] flex flex-col items-center justify-center">
          <Suspense fallback={<div className="chess-board-skeleton" />}>
            <ChessBoard
              gameState={gameState}
              onMove={sendMove}
              onBan={sendBan}
              playerColor={gameState.playerColor}
            />
          </Suspense>
        </div>

        {/* Right Column - Sidebar */}
        <div className="flex-[3] min-w-[300px] max-w-[400px] flex flex-col h-[600px] bg-slate-900/30 rounded-lg">
          {/* Status Section */}
          <GameStatus gameState={gameState} />

          {/* Player Information */}
          <div className="px-4 pb-4 space-y-2">
            <PlayerInfo color="white" username={gameState.players?.white} />
            <PlayerInfo color="black" username={gameState.players?.black} />
          </div>

          {/* Move History */}
          <MoveHistory history={gameState.history} />

          {/* Bottom Controls */}
          <div className="p-4 pt-0 flex items-center justify-between">
            <SoundControl />
            <button
              onClick={copyGameLink}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                copied 
                  ? "bg-green-600 text-white" 
                  : "bg-slate-700 hover:bg-slate-600 text-gray-300"
              }`}
            >
              {copied ? "✓ Copied" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerInfo({ color, username }: { color: 'white' | 'black'; username?: string }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${
          color === 'white' 
            ? 'bg-white border border-gray-400' 
            : 'bg-gray-800 border border-gray-600'
        }`} />
        <span className="text-sm font-medium text-gray-300 capitalize">{color}</span>
      </div>
      <span className="text-sm font-semibold text-white">
        {username || "Waiting..."}
      </span>
    </div>
  );
}