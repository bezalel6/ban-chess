"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useWebSocket } from "@/lib/ws-client";
import { useAuth } from "@/contexts/AuthContext";
import SoundControl from "@/components/SoundControl";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), {
  ssr: false,
});

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { user } = useAuth();
  const { gameState, error, connected, authenticated, sendMove, sendBan } =
    useWebSocket(gameId, user ? { userId: user.userId, username: user.username } : undefined);
  const [copied, setCopied] = useState(false);

  const copyGameLink = () => {
    // Remove the create parameter when sharing
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container-custom">
          <div className="error text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="container-custom">
          <div className="game-info text-center">
            <div className="loading-spinner mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Loading game...</h2>
          </div>
        </div>
      </div>
    );
  }

  const getStatusText = () => {
    const isMyTurn = gameState.turn === gameState.playerColor;
    const actionType = gameState.nextAction;

    if (!gameState.playerColor) {
      return "Spectating";
    }

    if (actionType === "ban") {
      if (isMyTurn) {
        return `Your turn: Ban one of ${
          gameState.turn === "white" ? "Black" : "White"
        }'s moves`;
      } else {
        return `Waiting for ${gameState.turn} to ban a move`;
      }
    } else {
      if (isMyTurn) {
        return "Your turn: Make a move";
      } else {
        return `Waiting for ${gameState.turn} to move`;
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] flex gap-6">
        {/* Left Column - Chess Board */}
        <div className="flex-[7] flex flex-col items-center justify-center">
          <ChessBoard
            gameState={gameState}
            onMove={sendMove}
            onBan={sendBan}
            playerColor={gameState.playerColor}
          />
        </div>

        {/* Right Column - Sidebar */}
        <div className="flex-[3] min-w-[300px] max-w-[400px] flex flex-col h-[600px] bg-slate-900/30 rounded-lg">
          {/* Status Section */}
          <div className="p-4 pb-3">
            <div className="text-lg font-semibold text-white">
              {gameState.turn === "white" ? "White" : "Black"} to {gameState.nextAction}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {getStatusText()}
            </div>
          </div>

          {/* Player Information */}
          <div className="px-4 pb-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-white border border-gray-400"></span>
                <span className="text-sm font-medium text-gray-300">White</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {gameState.players?.white || "Waiting..."}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-800 border border-gray-600"></span>
                <span className="text-sm font-medium text-gray-300">Black</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {gameState.players?.black || "Waiting..."}
              </span>
            </div>
          </div>

          {/* Move Log */}
          <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
            <div className="text-sm font-medium text-gray-400 mb-2">
              Moves
            </div>
            <div className="flex-1 bg-slate-800/30 rounded-lg p-3 overflow-y-auto">
              {gameState.history.length === 0 ? (
                <p className="text-sm text-gray-500">No moves yet</p>
              ) : (
                <div className="space-y-1">
                  {gameState.history.map((entry, idx) => (
                    <div key={idx} className="text-sm flex gap-2">
                      <span className="text-gray-500 font-mono">
                        {entry.turnNumber}.
                      </span>
                      <span className="text-gray-300">
                        {entry.player === "white" ? "White" : "Black"}
                      </span>
                      {entry.actionType === "ban" ? (
                        <span className="text-red-400 font-medium">
                          banned {entry.action.from}-{entry.action.to}
                        </span>
                      ) : (
                        <span className="text-white">
                          {entry.san || `${entry.action.from}-${entry.action.to}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
