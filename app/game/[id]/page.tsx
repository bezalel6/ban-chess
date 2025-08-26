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

  const getTurnIndicator = () => {
    const currentPlayer = gameState.turn;
    const nextAction = gameState.nextAction;

    return (
      <div className="mb-4">
        <span
          className={`inline-block w-5 h-5 rounded-full border-2 mr-2.5 align-middle ${
            currentPlayer === "white" ? "bg-white border-gray-400" : "bg-gray-900 border-gray-600"
          }`}
        />
        <span className="text-lg font-bold text-white">
          {currentPlayer === "white" ? "White" : "Black"} to {nextAction}
        </span>
      </div>
    );
  };

  return (
    <div className="container-custom">
      <SoundControl />
      <div className="text-center mb-5">
        <h1 className="text-3xl font-bold text-white mb-2">♟️ Ban Chess</h1>
        <p className="text-gray-400">Game ID: {gameId}</p>
        <button
          onClick={copyGameLink}
          className={`text-sm px-4 py-2 mt-2 rounded transition-all ${
            copied ? "bg-success-400 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
        >
          {copied ? "✓ Link Copied!" : "Copy Game Link"}
        </button>
      </div>

      <div className="game-info">
        {getTurnIndicator()}
        <div className="status">{getStatusText()}</div>

        {gameState.playerColor && (
          <div className="mt-3 text-gray-400">
            You are playing as:{" "}
            <strong className="text-white">{gameState.playerColor}</strong>
          </div>
        )}

        {gameState.players && (
          <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <div className="text-sm text-gray-300">
              <div className="mb-1">⚪ White: <span className="font-semibold text-white">{gameState.players.white || "Waiting..."}</span></div>
              <div>⚫ Black: <span className="font-semibold text-white">{gameState.players.black || "Waiting..."}</span></div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <details>
            <summary className="cursor-pointer font-bold text-white">
              Game History ({gameState.history.length} actions)
            </summary>
            <div className="mt-2.5 max-h-50 overflow-y-auto p-3 bg-slate-900/50 rounded border border-slate-700/50">
              {gameState.history.length === 0 ? (
                <p className="text-gray-500">No moves yet</p>
              ) : (
                gameState.history.map((entry, idx) => (
                  <div key={idx} className="mb-1 text-sm text-gray-300">
                    <span className="text-success-400 font-semibold">{entry.turnNumber}.</span> {entry.player}:
                    {entry.actionType === "ban" ? (
                      <span className="text-error-400">
                        {" "}
                        banned {entry.action.from}-{entry.action.to}
                      </span>
                    ) : (
                      <span className="text-white">
                        {" "}
                        {entry.san || `${entry.action.from}-${entry.action.to}`}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </div>

      <ChessBoard
        gameState={gameState}
        onMove={sendMove}
        onBan={sendBan}
        playerColor={gameState.playerColor}
      />

      <div className="text-center mt-5">
        <p className="text-gray-400 text-sm">
          {gameState.nextAction === "ban"
            ? "Click on an opponent piece, then click its destination to ban that move"
            : "Click on your piece, then click its destination to move"}
        </p>
      </div>
    </div>
  );
}
