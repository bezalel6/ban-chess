"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import ResizableBoard from "@/components/game/ResizableBoard";
import GameStatusPanel from "@/components/game/GameStatusPanel";
import GameSidebar from "@/components/game/GameSidebar";
import type { Move, Ban, HistoryEntry } from "@/lib/game-types";

interface GameViewerProps {
  gameId: string;
}

export default function GameViewer({ gameId }: GameViewerProps) {
  const router = useRouter();
  const {
    gameState,
    dests,
    orientation,
    isMyTurn,
    isGameOver,
    activePlayer,
    actionType,
    makeMove,
    makeBan,
    resign
  } = useGame(gameId);

  const [initiallyCompleted, setInitiallyCompleted] = useState(false);
  const gameEndedRef = useRef(false);
  const [fullHistory, setFullHistory] = useState<HistoryEntry[]>([]);

  // Check if this is a local/solo game
  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  // Track game completion state
  useEffect(() => {
    if (gameState && !initiallyCompleted) {
      if (isGameOver || (gameState as unknown as Record<string, unknown>).dataSource === 'completed') {
        setInitiallyCompleted(true);
      }
    }
    
    // Update history if available
    if (gameState?.history && gameState.history.length > 0) {
      if (typeof gameState.history[0] !== 'string') {
        setFullHistory(gameState.history as HistoryEntry[]);
      }
    }
  }, [gameState, isGameOver, initiallyCompleted]);

  // Handle game end
  useEffect(() => {
    if (isGameOver && !gameEndedRef.current && !initiallyCompleted) {
      gameEndedRef.current = true;
      // Could add game end handling here (redirect, notifications, etc.)
    }
  }, [isGameOver, initiallyCompleted]);

  // Merge full history with game state
  const effectiveGameState = useMemo(() => {
    if (!gameState) return null;
    if (fullHistory.length > 0 && isGameOver) {
      return {
        ...gameState,
        history: fullHistory
      };
    }
    return gameState;
  }, [gameState, fullHistory, isGameOver]);

  // Handle moves and bans
  const handleMove = (move: Move) => {
    if (isGameOver) return;
    if (isLocalGame || isMyTurn) {
      makeMove(move.from, move.to);
    }
  };

  const handleBan = (ban: Ban) => {
    if (isGameOver) return;
    if (isLocalGame || isMyTurn) {
      // Convert ban to square notation
      const square = `${ban.from}${ban.to}`;
      makeBan(square);
    }
  };

  const handleResign = () => {
    resign();
  };

  // Loading state
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <h2 className="text-xl font-semibold">Loading game...</h2>
        </div>
      </div>
    );
  }

  // Game not found
  if ((gameState as unknown as Record<string, unknown>)?.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
          <p className="text-foreground-muted mb-4">
            The game you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto">
      {/* Main Board Area */}
      <div className="flex-1 min-w-0">
        <ResizableBoard
          gameState={effectiveGameState!}
          orientation={orientation}
          dests={dests}
          activePlayer={activePlayer}
          actionType={actionType}
          canInteract={!isGameOver && (isLocalGame || isMyTurn)}
          onMove={handleMove}
          onBan={handleBan}
        />

        {/* Game Status Panel */}
        <div className="mt-4">
          <GameStatusPanel
            gameState={effectiveGameState!}
            activePlayer={activePlayer}
            actionType={actionType}
            isOfflineGame={isLocalGame}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:w-80">
        <GameSidebar
          gameState={effectiveGameState!}
          isLocalGame={isLocalGame}
          onResign={!isGameOver && !isLocalGame ? handleResign : undefined}
        />
      </div>
    </div>
  );
}