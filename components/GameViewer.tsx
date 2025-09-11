"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/contexts/GameContext";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";
import type { Move, Ban, HistoryEntry } from "@/lib/game-types";

interface GameViewerProps {
  gameId: string;
  mode?: string;
  thumbnailSize?: number;
  onThumbnailClick?: () => void;
  viewOptions?: Record<string, unknown>;
}

export default function GameViewer({ 
  gameId, 
  viewOptions = {}
}: GameViewerProps) {
  const { manager, gameState, send, connected } = useGame();
  const game = manager.getGame();

  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  useRouter();
  const { user } = useAuth();
  const { role: contextRole } = useUserRole();
  
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [initiallyCompleted, setInitiallyCompleted] = useState(false);
  const gameEndedRef = useRef(false);
  
  const [fullHistory, setFullHistory] = useState<HistoryEntry[]>([]);
  
  useEffect(() => {
    if (contextRole === "black") {
      setBoardOrientation("black");
    } else {
      setBoardOrientation("white");
    }
  }, [contextRole]);

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

  if (!connected && !initiallyCompleted) {
    return <div>Connecting...</div>;
  }

  if (!effectiveGameState) {
    return <div>Loading game...</div>;
  }

  return <div>Rendering Game...</div>;
}