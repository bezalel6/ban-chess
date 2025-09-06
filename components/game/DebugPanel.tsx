"use client";

import { useState, useMemo } from "react";
import type { SimpleGameState } from "@/lib/game-types";
import { parseFEN } from "@/lib/game-types";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useGameState } from "@/hooks/useGameState";
import { BanChess } from "ban-chess.ts";

interface DebugPanelProps {
  gameState: SimpleGameState;
  game: BanChess | null;
  dests: Map<string, string[]>;
  onRefreshBoard?: () => void;
}

export default function DebugPanel({ gameState, game, dests, onRefreshBoard }: DebugPanelProps) {
  const [frozen, setFrozen] = useState(true);
  const [frozenConfig, setFrozenConfig] = useState<Record<string, unknown> | null>(null);
  
  const { role, orientation } = useUserRole();
  const { activePlayer, actionType } = useGameState({ disableToasts: true });
  
  const fenData = useMemo(() => {
    if (!gameState?.fen) return null;
    return parseFEN(gameState.fen);
  }, [gameState?.fen]);
  
  const currentActivePlayer = activePlayer || game?.getActivePlayer() || "white";
  const currentAction = actionType || game?.getActionType() || "move";
  
  const isPlayer = role !== null;
  const isMyTurn = isPlayer && role === currentActivePlayer && !gameState?.gameOver;
  const canMove = isMyTurn && currentAction === "move";
  const canBan = isMyTurn && currentAction === "ban";
  
  // Create the debug config object
  const debugConfig = {
    fen: gameState?.fen,
    orientation,
    role,
    turn: fenData?.turn,
    activePlayer: currentActivePlayer,
    action: currentAction,
    canMove,
    canBan,
    gameOver: gameState?.gameOver,
    result: gameState?.result,
    ply: gameState?.ply,
    dests: dests ? Array.from(dests.entries()).map(([k, v]) => [k, v]) : [],
    players: gameState?.players,
  };
  
  // Capture config when freezing
  const handleFreeze = () => {
    if (!frozen) {
      setFrozenConfig(debugConfig);
    }
    setFrozen(!frozen);
  };
  
  // Use frozen config if frozen and available, otherwise live config
  const displayConfig = frozen && frozenConfig ? frozenConfig : debugConfig;
  
  return (
    <div className="fixed bottom-4 left-4 w-96 bg-gray-900 text-green-400 max-h-64 overflow-y-auto border-2 border-gray-700 rounded-lg z-[9999]">
      <details className="p-2">
        <summary className="cursor-pointer text-xs font-mono text-gray-400 hover:text-green-400 flex items-center justify-between">
          <span>Game Debug Info (click to expand)</span>
          <div className="flex gap-2">
            {onRefreshBoard && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshBoard();
                }}
                className="px-2 py-1 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-700"
              >
                🔄 Refresh Board
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFreeze();
              }}
              className={`px-2 py-1 text-xs rounded ${
                frozen 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}
            >
              {frozen ? '❄️ Frozen' : '🔴 Live'}
            </button>
          </div>
        </summary>
        <pre className="text-xs font-mono mt-2 whitespace-pre-wrap">
          {JSON.stringify(displayConfig, null, 2)}
        </pre>
      </details>
    </div>
  );
}