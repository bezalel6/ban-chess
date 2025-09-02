"use client";

import { useState } from "react";
import type { SimpleGameState } from "@/lib/game-types";
import {
  parseFEN,
  getNextAction,
  getCurrentBan,
  isGameOver,
  getWhoBans,
} from "@/lib/game-types";

interface DebugPanelProps {
  gameState: SimpleGameState | null;
  connected: boolean;
  authenticated: boolean;
  error: string | null;
}

export default function DebugPanel({
  gameState,
  connected,
  authenticated,
  error,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const fenData = gameState ? parseFEN(gameState.fen) : null;
  const nextAction = gameState ? getNextAction(gameState.fen) : null;
  const whoBans = gameState ? getWhoBans(gameState.fen) : null;
  const currentBan = gameState ? getCurrentBan(gameState.fen) : null;
  const gameOver = gameState ? isGameOver(gameState.fen) : false;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-background-secondary hover:bg-background-tertiary text-foreground text-sm font-mono flex items-center justify-between transition-colors"
      >
        <span>🐛 Debug Panel</span>
        <span>{isExpanded ? "▼" : "▲"}</span>
      </button>

      {isExpanded && (
        <div className="p-4 max-h-96 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            {/* Connection Status */}
            <div className="bg-background-secondary rounded p-3">
              <h3 className="text-lichess-green font-bold mb-2">
                Connection Status
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Connected:</span>
                  <span
                    className={
                      connected ? "text-lichess-green" : "text-destructive"
                    }
                  >
                    {connected ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Authenticated:</span>
                  <span
                    className={
                      authenticated ? "text-lichess-green" : "text-destructive"
                    }
                  >
                    {authenticated ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                {error && (
                  <div className="mt-2 text-destructive">Error: {error}</div>
                )}
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-background-secondary rounded p-3">
              <h3 className="text-lichess-orange-500 font-bold mb-2">
                Game Info
              </h3>
              {gameState ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Game ID:</span>
                    <span className="text-foreground">
                      {gameState.gameId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Players:</span>
                    <span className="text-foreground">
                      {gameState.players.white && gameState.players.black
                        ? "Multiplayer"
                        : "Waiting..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">White:</span>
                    <span className="text-foreground">
                      {gameState.players.white?.username || "Waiting..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Black:</span>
                    <span className="text-foreground">
                      {gameState.players.black?.username || "Waiting..."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-foreground-subtle italic">
                  No game state yet
                </div>
              )}
            </div>

            {/* FEN Parse Info */}
            <div className="bg-background-secondary rounded p-3">
              <h3 className="text-warning-500 font-bold mb-2">FEN Parse</h3>
              {fenData ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Turn:</span>
                    <span
                      className={
                        fenData.turn === "white"
                          ? "text-foreground"
                          : "text-foreground-subtle"
                      }
                    >
                      {fenData.turn === "white" ? "⚪ White" : "⚫ Black"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Next Action:</span>
                    <span
                      className={
                        nextAction === "ban"
                          ? "text-lichess-orange-500"
                          : "text-lichess-green"
                      }
                    >
                      {nextAction === "ban" ? "🚫 Ban" : "♟️ Move"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Move #:</span>
                    <span className="text-foreground">{fenData.fullMove}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Half Move:</span>
                    <span className="text-foreground">{fenData.halfMove}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Castling:</span>
                    <span className="text-foreground">
                      {fenData.castling || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">En Passant:</span>
                    <span className="text-foreground">
                      {fenData.enPassant || "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-foreground-subtle italic">
                  No FEN data yet
                </div>
              )}
            </div>

            {/* Ban State */}
            <div className="bg-background-secondary rounded p-3">
              <h3 className="text-lichess-orange-500 font-bold mb-2">
                Ban State
              </h3>
              {fenData ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Ban Field:</span>
                    <span className="text-foreground">
                      {fenData.banState || "None"}
                    </span>
                  </div>
                  {whoBans && (
                    <div className="flex justify-between">
                      <span className="text-foreground-muted">Who Bans:</span>
                      <span
                        className={
                          whoBans === "white"
                            ? "text-foreground"
                            : "text-foreground-subtle"
                        }
                      >
                        {whoBans === "white" ? "⚪ White" : "⚫ Black"}
                      </span>
                    </div>
                  )}
                  {currentBan && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-foreground-muted">
                          Banned Move:
                        </span>
                        <span className="text-destructive">
                          {currentBan.from} → {currentBan.to}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Game Over:</span>
                    <span
                      className={
                        gameOver ? "text-destructive" : "text-lichess-green"
                      }
                    >
                      {gameOver ? "🏁 Yes" : "🎮 No"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-foreground-subtle italic">
                  No ban state yet
                </div>
              )}
            </div>

            {/* Raw FEN */}
            <div className="bg-background-secondary rounded p-3 lg:col-span-2">
              <h3 className="text-lichess-brown-500 font-bold mb-2">
                Raw FEN String
              </h3>
              {gameState ? (
                <>
                  <div className="bg-background rounded p-2 break-all">
                    <code className="text-xs text-lichess-green">
                      {gameState.fen}
                    </code>
                  </div>
                  <div className="mt-2 text-foreground-subtle text-xs">
                    Format: [position] [turn] [castling] [en-passant]
                    [half-move] [full-move] [ban-state]
                  </div>
                </>
              ) : (
                <div className="text-foreground-subtle italic">
                  No FEN string yet
                </div>
              )}
            </div>
          </div>

          {/* Action Summary */}
          <div className="mt-4 p-3 bg-background-secondary rounded">
            <h3 className="text-lichess-orange-400 font-bold mb-2">
              Current State Summary
            </h3>
            <div className="text-white">
              {!gameState ? (
                <span className="text-foreground-subtle italic">
                  Waiting for game state...
                </span>
              ) : gameOver ? (
                <span className="text-destructive font-bold">
                  🏁 Game Over!
                </span>
              ) : fenData ? (
                <>
                  {nextAction === "ban" ? (
                    <>
                      <span
                        className={
                          whoBans === "white"
                            ? "text-foreground"
                            : "text-foreground-subtle"
                        }
                      >
                        {whoBans === "white" ? "White" : "Black"}
                      </span>{" "}
                      to <span className="text-lichess-orange-500">BAN</span>{" "}
                      (for {fenData.turn === "white" ? "White" : "Black"}&apos;s
                      upcoming move)
                    </>
                  ) : (
                    <>
                      <span
                        className={
                          fenData.turn === "white"
                            ? "text-foreground"
                            : "text-foreground-subtle"
                        }
                      >
                        {fenData.turn === "white" ? "White" : "Black"}
                      </span>{" "}
                      to <span className="text-lichess-green">MOVE</span>
                    </>
                  )}
                  {currentBan && (
                    <>
                      {" "}
                      (Banned:{" "}
                      <span className="text-destructive">
                        {currentBan.from}→{currentBan.to}
                      </span>
                      )
                    </>
                  )}{" "}
                  - Move #{fenData.fullMove}
                </>
              ) : (
                <span className="text-foreground-subtle italic">
                  Invalid FEN state
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
