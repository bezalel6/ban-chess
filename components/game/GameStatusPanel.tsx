"use client";

import type { SimpleGameState } from "@/lib/game-types";
import { getCurrentBan } from "@/lib/game-types";
import { getGamePermissions } from "@/lib/game-utils";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";

interface GameStatusPanelProps {
  gameState: SimpleGameState;
  onNewGame?: () => void;
}

export default function GameStatusPanel({
  gameState,
  onNewGame,
}: GameStatusPanelProps) {
  const { user } = useAuth();
  const { game } = useGameState();
  const permissions = getGamePermissions(gameState, game, user?.userId, gameState?.activePlayer);
  const { role, isMyTurn, isPlayer } = permissions;
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = game ? game.nextActionType() : "move";
  
  // Get ply and active player info from gameState (server-provided)
  const ply = gameState?.ply || 0;
  const activePlayer = gameState?.activePlayer || "unknown";

  // Format time control display
  const formatTimeControl = () => {
    if (!gameState.timeControl) return "Unlimited";
    const { initial, increment } = gameState.timeControl;
    const minutes = Math.floor(initial / 60);
    return `${minutes}+${increment}`;
  };

  // Determine game mode based on whether the same user is playing both sides
  const gameMode =
    gameState.players.white?.id === gameState.players.black?.id
      ? "Practice"
      : "Game";

  return (
    <div className="bg-background-secondary rounded-lg p-3 flex flex-col">
      {/* STATUS Section */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-foreground-muted mb-2">
          STATUS
        </h3>

        {/* Game Info Grid - Compact 2-column layout */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-background-tertiary rounded-md p-2">
            <div className="text-xs text-foreground-muted uppercase">Time</div>
            <div className="text-sm font-semibold text-foreground">
              {formatTimeControl()}
            </div>
          </div>

          <div className="bg-background-tertiary rounded-md p-2">
            <div className="text-xs text-foreground-muted uppercase">Mode</div>
            <div className="text-sm font-semibold text-foreground">
              {gameMode}
            </div>
          </div>
        </div>
        
        {/* Debug Ply Info - shows current game state */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-2">
            <div className="text-xs text-blue-400 uppercase">Ply</div>
            <div className="text-sm font-bold text-blue-500">
              {ply}
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-2">
            <div className="text-xs text-blue-400 uppercase">Active</div>
            <div className="text-sm font-bold text-blue-500 capitalize">
              {activePlayer}
            </div>
          </div>
        </div>

        {isPlayer && (
          <div className="bg-background-tertiary rounded-md p-2 mb-3">
            <div className="text-xs text-foreground-muted uppercase">
              Playing as
            </div>
            <div className="text-sm font-semibold text-foreground capitalize">
              {role}
            </div>
          </div>
        )}

        {/* Game State */}
        {gameState.gameOver ? (
          <div className="space-y-3">
            <div className="bg-yellow-500 text-black px-3 py-2 rounded-md font-bold text-center animate-pulse">
              GAME OVER
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {gameState.result}
              </p>
            </div>
            {onNewGame && (
              <button
                onClick={onNewGame}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium text-sm"
              >
                New Game
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Current Turn Status - Prominent but compact */}
            <div
              className={`rounded-md p-2 mb-3 text-center ${
                isMyTurn
                  ? "bg-primary/20 border border-primary/30"
                  : "bg-background-tertiary"
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  isMyTurn ? "text-primary" : "text-foreground-muted"
                }`}
              >
                {nextAction === "ban"
                  ? isMyTurn
                    ? "🎯 Select a move to ban"
                    : "⏳ Opponent banning..."
                  : isMyTurn
                    ? "🎯 Your turn"
                    : "⏳ Opponent's turn"}
              </div>
            </div>

            {/* Banned Move - Compact alert style */}
            {currentBan && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-md p-2">
                <div className="text-xs text-red-400">Banned Move</div>
                <div className="text-sm font-bold text-red-500">
                  {currentBan.from.toUpperCase()} →{" "}
                  {currentBan.to.toUpperCase()}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* GAME CHAT Section - Compact height */}
      <div className="flex flex-col mt-3">
        <h3 className="text-sm font-semibold text-foreground-muted mb-2">
          GAME CHAT
        </h3>
        <div className="h-24 bg-background-tertiary rounded-md p-2 overflow-y-auto">
          <p className="text-xs text-foreground-muted italic">
            Chat coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
