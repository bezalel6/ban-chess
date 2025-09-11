"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";
import ResizableBoard from "@/components/game/ResizableBoard";
import GameStatusPanel from "@/components/game/GameStatusPanel";
import GameSidebar from "@/components/game/GameSidebar";
import type { Move, Ban, HistoryEntry } from "@/lib/game-types";

interface GameViewerProps {
  gameId: string;
}

export default function GameViewer({ gameId }: GameViewerProps) {
  const { manager, gameState, send, connected } = useGame();
  const game = manager.getGame();

  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  useRouter();
  const { user } = useAuth();
  const { role: contextRole } = useUserRole();
  
  const [initiallyCompleted, setInitiallyCompleted] = useState(false);
  const gameEndedRef = useRef(false);
  
  const [fullHistory, setFullHistory] = useState<HistoryEntry[]>([]);
  
  const effectiveGameState = useMemo(() => {
    if (!gameState) return null;
    if (fullHistory.length > 0 && gameState.gameOver) {
      return {
        ...gameState,
        history: fullHistory
      };
    }
    return gameState;
  }, [gameState, fullHistory]);

  useEffect(() => {
    if (gameState && !initiallyCompleted) {
      if (gameState.gameOver || gameState.dataSource === 'completed') {
        setInitiallyCompleted(true);
      }
    }
    if (gameState?.history && gameState.history.length > 0) {
      if (typeof gameState.history[0] !== 'string') {
        setFullHistory(gameState.history as HistoryEntry[]);
      }
    }
  }, [gameState, initiallyCompleted]);

  useEffect(() => {
    if (gameState?.gameOver && !gameEndedRef.current && !initiallyCompleted) {
      gameEndedRef.current = true;
    }
  }, [gameState?.gameOver, gameState?.result, initiallyCompleted]);

  const isGameLive = effectiveGameState && !effectiveGameState.gameOver;

  const userRole = user && effectiveGameState ? getUserRole(effectiveGameState, user.userId) : null;
  const userColor = userRole?.role;
  const activePlayer = game?.getActivePlayer();

  // All hooks must be called before any conditional returns
  const dests = useMemo(() => {
    if (!game || !isGameLive) return new Map();
    if (!isLocalGame && userColor !== activePlayer) return new Map();
    
    const actionType = game.getActionType();
    const legalActions = game.getLegalActions();
    const destsMap = new Map<string, string[]>();
    
    legalActions.forEach((action) => {
      if (actionType === 'ban' && 'ban' in action) {
        const ban = action.ban;
        // For bans, we just need the squares that can be banned
        destsMap.set(`${ban.from}-${ban.to}`, []);
      } else if (actionType === 'move' && 'move' in action) {
        const move = action.move;
        if (!destsMap.has(move.from)) {
          destsMap.set(move.from, []);
        }
        destsMap.get(move.from)!.push(move.to);
      }
    });
    
    return destsMap;
  }, [game, isGameLive, isLocalGame, userColor, activePlayer]);

  const handleMove = (move: Move) => {
    if (!isGameLive) return;
    if (isLocalGame || userColor === activePlayer) {
      send(manager.sendActionMsg(gameId, { move }));
    }
  };

  const handleBan = (ban: Ban) => {
    if (!isGameLive) return;
    if (isLocalGame || userColor === activePlayer) {
      send(manager.sendActionMsg(gameId, { ban }));
    }
  };

  // Conditional returns come after all hooks
  if (!connected && !initiallyCompleted) {
    return <div>Connecting...</div>;
  }

  if (!effectiveGameState) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Main game area */}
      <div className="flex-1 flex flex-col gap-4">
        <GameStatusPanel gameState={effectiveGameState} />
        <div className="flex-1 flex items-center justify-center">
          <ResizableBoard
            gameState={effectiveGameState}
            dests={dests}
            activePlayer={activePlayer}
            actionType={game?.getActionType()}
            onMove={handleMove}
            onBan={handleBan}
            orientation={contextRole === "black" ? "black" : "white"}
            canInteract={!!isGameLive && (isLocalGame || userColor === activePlayer)}
            banDifficulty={contextRole === "black" ? "medium" : "medium"}
          />
        </div>
      </div>

      {/* Sidebar */}
      <GameSidebar gameState={effectiveGameState} />
    </div>
  );
}