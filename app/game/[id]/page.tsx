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
      <div className="container-custom">
        <div className="game-info text-center">
          <h2>{!connected ? "Connecting to game server..." : "Authenticating..."}</h2>
          <p>Please wait while we establish a connection.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="container-custom">
        <div className="game-info text-center">
          <h2>Loading game...</h2>
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
          className={`inline-block w-5 h-5 rounded-full border-2 border-gray-500 mr-2.5 align-middle ${
            currentPlayer === "white" ? "bg-white" : "bg-gray-800"
          }`}
        />
        <span className="text-lg font-bold">
          {currentPlayer === "white" ? "White" : "Black"} to {nextAction}
        </span>
      </div>
    );
  };

  return (
    <div className="container-custom">
      <SoundControl />
      <div className="text-center mb-5">
        <h1>♟️ Ban Chess</h1>
        <p className="text-dark-200">Game ID: {gameId}</p>
        <button
          onClick={copyGameLink}
          className={`text-sm px-4 py-1 mt-2.5 transition-colors ${
            copied ? "bg-success-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {copied ? "Link Copied!" : "Copy Game Link"}
        </button>
      </div>

      <div className="game-info">
        {getTurnIndicator()}
        <div className="status">{getStatusText()}</div>

        {gameState.playerColor && (
          <div className="mt-2.5 text-dark-300">
            You are playing as:{" "}
            <strong className="text-gray-100">{gameState.playerColor}</strong>
          </div>
        )}

        {gameState.players && (
          <div className="mt-2.5 text-dark-300">
            <div>⚪ White: {gameState.players.white || "Waiting..."}</div>
            <div>⚫ Black: {gameState.players.black || "Waiting..."}</div>
          </div>
        )}

        <div className="mt-4">
          <details>
            <summary className="cursor-pointer font-bold">
              Game History ({gameState.history.length} actions)
            </summary>
            <div className="mt-2.5 max-h-50 overflow-y-auto p-2.5 bg-slate-700/80 rounded">
              {gameState.history.length === 0 ? (
                <p>No moves yet</p>
              ) : (
                gameState.history.map((entry, idx) => (
                  <div key={idx} className="mb-1">
                    {entry.turnNumber}. {entry.player}:
                    {entry.actionType === "ban" ? (
                      <span>
                        {" "}
                        banned {entry.action.from}-{entry.action.to}
                      </span>
                    ) : (
                      <span>
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
        <p className="text-dark-200 text-sm">
          {gameState.nextAction === "ban"
            ? "Click on an opponent piece, then click its destination to ban that move"
            : "Click on your piece, then click its destination to move"}
        </p>
      </div>
    </div>
  );
}
