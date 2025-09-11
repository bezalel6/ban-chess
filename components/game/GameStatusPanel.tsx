"use client";

import type { SimpleGameState } from "@/lib/game-types";
import { getCurrentBan } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useGameState } from "@/hooks/useGameState";

interface GameStatusPanelProps {
  gameState: SimpleGameState;
  activePlayer?: "white" | "black";
  actionType?: "move" | "ban";
  isOfflineGame?: boolean;
  onNewGame?: () => void;
}

export default function GameStatusPanel({
  gameState,
  activePlayer: propActivePlayer,
  actionType: propActionType,
  isOfflineGame = false,
  onNewGame,
}: GameStatusPanelProps) {
  // For offline games, use props directly. For online games, use the hook
  const hookData = useGameState(undefined, { disableToasts: true });
  const activePlayer = isOfflineGame ? propActivePlayer : hookData.activePlayer;
  const actionType = isOfflineGame ? propActionType : hookData.actionType;
  
  const { role } = useUserRole();
  const isPlayer = role !== null && !isOfflineGame; // Offline games don't use role
  const currentActivePlayer = activePlayer || gameState?.activePlayer || "white";
  const isMyTurn = isPlayer && role === currentActivePlayer && !gameState?.gameOver;
  const currentBan = getCurrentBan(gameState.fen);
  const nextAction = actionType || "move";
  
  // Get ply info from gameState (server-provided)
  const ply = gameState?.ply || 0;

  // Format time control display
  const formatTimeControl = () => {
    if (!gameState.timeControl) return "Unlimited";
    
    // Handle both object format (from WebSocket) and string format (from database)
    if (typeof gameState.timeControl === 'string') {
      // Database format: "900+10" or "unlimited"
      if (gameState.timeControl === 'unlimited') return "Unlimited";
      return (gameState.timeControl as string).replace(/(\d+)\+/, (_, seconds) => {
        const minutes = Math.floor(parseInt(seconds) / 60);
        return `${minutes}+`;
      });
    } else if (gameState.timeControl && typeof gameState.timeControl === 'object') {
      // WebSocket format: { initial: 900, increment: 10 }
      const { initial, increment } = gameState.timeControl;
      const minutes = Math.floor(initial / 60);
      return `${minutes}+${increment}`;
    }
    return "Unlimited";
  };

  // Determine game mode based on whether the same user is playing both sides
  const gameMode =
    gameState.players.white?.id === gameState.players.black?.id
      ? "Practice"
      : "Game";

  return (
    <div className="bg-background-secondary rounded-lg p-3 flex flex-col w-full min-w-0">
      {/* STATUS Section */}
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-semibold text-foreground-muted">
          STATUS
        </h3>

        {/* Game Info Grid - Compact 2-column layout */}
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div className="bg-background-tertiary rounded-md p-2 min-w-0">
            <div className="text-xs text-foreground-muted uppercase">Time</div>
            <div className="text-sm font-semibold text-foreground truncate">
              {formatTimeControl()}
            </div>
          </div>

          <div className="bg-background-tertiary rounded-md p-2 min-w-0">
            <div className="text-xs text-foreground-muted uppercase">Mode</div>
            <div className="text-sm font-semibold text-foreground truncate">
              {gameMode}
            </div>
          </div>
        </div>
        
        {/* Data Source Indicator - Only show when present */}
        {gameState.dataSource && (
          <div className={`rounded-md p-2 min-w-0 ${
            gameState.dataSource === 'active' 
              ? 'bg-green-900/20 border border-green-500/30' 
              : 'bg-purple-900/20 border border-purple-500/30'
          }`}>
            <div className={`text-xs uppercase ${
              gameState.dataSource === 'active' 
                ? 'text-green-400' 
                : 'text-purple-400'
            }`}>
              Data Source
            </div>
            <div className={`text-sm font-bold truncate ${
              gameState.dataSource === 'active' 
                ? 'text-green-500' 
                : 'text-purple-500'
            }`}>
              {gameState.dataSource === 'active' ? '🟢 Active (Redis)' : '💾 Completed (Database)'}
            </div>
          </div>
        )}
        
        {/* Debug Ply Info - shows current game state */}
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-2 min-w-0">
            <div className="text-xs text-blue-400 uppercase">Ply</div>
            <div className="text-sm font-bold text-blue-500 truncate">
              {ply}
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-md p-2 min-w-0">
            <div className="text-xs text-blue-400 uppercase">Active</div>
            <div className="text-sm font-bold text-blue-500 capitalize truncate">
              {currentActivePlayer}
            </div>
          </div>
        </div>

        {/* Playing As - Only show when player */}
        {isPlayer && (
          <div className="bg-background-tertiary rounded-md p-2 min-w-0">
            <div className="text-xs text-foreground-muted uppercase">
              Playing as
            </div>
            <div className="text-sm font-semibold text-foreground capitalize truncate">
              {role}
            </div>
          </div>
        )}

        {/* Game State */}
        {gameState.gameOver ? (
          <div className="space-y-3">
            <div className={`px-3 py-2 rounded-md font-bold text-center animate-pulse ${
              gameState.resultReason === 'checkmate' 
                ? 'bg-red-600 text-white' 
                : 'bg-yellow-500 text-black'
            }`}>
              {gameState.resultReason === 'checkmate' ? 'CHECKMATE!' : 'GAME OVER'}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {gameState.result}
              </p>
              {gameState.resultReason && (
                <p className="text-xs text-foreground-muted mt-1">
                  by {gameState.resultReason}
                </p>
              )}
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
              className={`rounded-md p-2 text-center min-w-0 ${
                isMyTurn
                  ? "bg-primary/20 border border-primary/30"
                  : "bg-background-tertiary"
              }`}
            >
              <div
                className={`text-sm font-semibold truncate ${
                  isMyTurn ? "text-primary" : "text-foreground-muted"
                }`}
              >
                {nextAction === "ban"
                  ? `${currentActivePlayer.charAt(0).toUpperCase() + currentActivePlayer.slice(1)} is banning...`
                  : isMyTurn
                    ? "🎯 Your turn"
                    : "⏳ Opponent's turn"}
              </div>
            </div>

            {/* Banned Move - Min height to prevent jarring changes */}
            <div className={`rounded-md p-2 min-w-0 min-h-[44px] flex flex-col justify-center transition-colors ${
              currentBan 
                ? "bg-red-900/20 border border-red-500/30" 
                : "bg-background-tertiary/50 border border-background-tertiary"
            }`}>
              {currentBan ? (
                <>
                  <div className="text-xs text-red-400">Banned Move</div>
                  <div className="text-sm font-bold text-red-500 font-mono truncate">
                    {currentBan.from.toUpperCase()} → {currentBan.to.toUpperCase()}
                  </div>
                </>
              ) : (
                <div className="text-xs text-foreground-muted/50 text-center">No banned move</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* GAME CHAT Section - Compact height */}
      <div className="flex flex-col mt-3 min-w-0">
        <h3 className="text-sm font-semibold text-foreground-muted mb-2">
          GAME CHAT
        </h3>
        <div className="h-24 bg-background-tertiary rounded-md p-2 overflow-y-auto min-w-0">
          <p className="text-xs text-foreground-muted italic truncate">
            Chat coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
