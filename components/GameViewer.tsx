"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import { BanChess } from "ban-chess.ts";
import ResizableBoard from "@/components/game/ResizableBoard";
import GameStatusPanel from "@/components/game/GameStatusPanel";
import GameSidebar from "@/components/game/GameSidebar";
import PlayerInfo from "@/components/game/PlayerInfo";
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

  // Navigation state for move history
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatedGameState, setNavigatedGameState] = useState<typeof gameState | null>(null);

  // Check if this is a local/solo game
  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  // For solo games, orientation should follow the active player
  // For online games, use the player's perspective
  const boardOrientation = useMemo(() => {
    if (isLocalGame && activePlayer) {
      return activePlayer;
    }
    return orientation;
  }, [isLocalGame, activePlayer, orientation]);

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

  // Handle move navigation through history
  const handleMoveSelect = useCallback((moveIndex: number) => {
    if (!effectiveGameState?.actionHistory) return;

    setCurrentMoveIndex(moveIndex);

    // Check if returning to current position
    const isCurrentPosition = moveIndex === effectiveGameState.actionHistory.length - 1;

    if (isCurrentPosition) {
      // Return to live position
      setIsNavigating(false);
      setNavigatedGameState(null);
    } else {
      // Navigate to historical position
      setIsNavigating(true);

      try {
        let reconstructedGame: BanChess;

        if (moveIndex === -1) {
          // Starting position
          reconstructedGame = new BanChess();
        } else {
          // Replay actions up to the selected move
          const actionsToReplay = effectiveGameState.actionHistory.slice(0, moveIndex + 1);
          reconstructedGame = BanChess.replayFromActions(actionsToReplay);
        }

        // Create a new game state with the reconstructed position
        // Only update FEN since it's the source of truth for all game state
        const newGameState = {
          ...effectiveGameState,
          fen: reconstructedGame.fen(),
          activePlayer: reconstructedGame.getActivePlayer(),
          ply: reconstructedGame.getPly(),
          inCheck: reconstructedGame.inCheck(),
        };

        setNavigatedGameState(newGameState);
      } catch (error) {
        console.error('Error navigating to move:', error);
        setIsNavigating(false);
        setNavigatedGameState(null);
      }
    }
  }, [effectiveGameState]);

  // Return to live position
  const handleReturnToLive = useCallback(() => {
    if (effectiveGameState?.actionHistory) {
      const lastIndex = effectiveGameState.actionHistory.length - 1;
      handleMoveSelect(lastIndex);
    }
  }, [effectiveGameState, handleMoveSelect]);

  // Reset navigation when game state changes (new moves in live game)
  useEffect(() => {
    if (isNavigating && !isGameOver) {
      // If we're navigating and a new move comes in, stay in navigation mode
      // but the user can click "Live" to return
    }
  }, [gameState, isNavigating, isGameOver]);

  // Handle moves and bans
  const handleMove = (move: Move) => {
    if (isGameOver || isNavigating) return;
    if (isLocalGame || isMyTurn) {
      makeMove(move.from, move.to);
    }
  };

  const handleBan = (ban: Ban) => {
    if (isGameOver || isNavigating) return;
    if (isLocalGame || isMyTurn) {
      // Convert ban to square notation
      const square = `${ban.from}${ban.to}`;
      makeBan(square);
    }
  };

  const handleResign = () => {
    resign();
  };

  // Determine which game state to display on the board
  const displayGameState = isNavigating && navigatedGameState ? navigatedGameState : effectiveGameState;

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
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1800px] mx-auto">
      {/* Left Sidebar - Opponent Info */}
      <div className="lg:w-64 hidden lg:block">
        <div className="bg-background-secondary rounded-lg p-4 shadow-lg">
          <PlayerInfo
            username={boardOrientation === 'white' ? (gameState?.players.black?.username || "Waiting...") : (gameState?.players.white?.username || "Waiting...")}
            isTurn={boardOrientation === 'white' ? (activePlayer === 'black' && !isGameOver) : (activePlayer === 'white' && !isGameOver)}
            clock={boardOrientation === 'white' ? gameState?.clocks?.black : gameState?.clocks?.white}
            isClockActive={boardOrientation === 'white' ? (activePlayer === 'black' && !isGameOver) : (activePlayer === 'white' && !isGameOver)}
            isOnline={boardOrientation === 'white' ? (gameState?.players.black?.username !== "Waiting...") : (gameState?.players.white?.username !== "Waiting...")}
          />
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 min-w-0 flex flex-col items-center">
        <ResizableBoard
          gameState={displayGameState!}
          orientation={boardOrientation}
          dests={isNavigating ? new Map() : dests}
          activePlayer={activePlayer}
          actionType={actionType}
          canInteract={!isGameOver && !isNavigating && (isLocalGame || isMyTurn)}
          onMove={handleMove}
          onBan={handleBan}
        />

        {/* Game Status Panel */}
        <div className="mt-4 w-full max-w-2xl">
          <GameStatusPanel
            gameState={displayGameState!}
            gameId={gameId}
            activePlayer={activePlayer}
            actionType={actionType}
            isOfflineGame={isLocalGame}
          />
        </div>
      </div>

      {/* Right Sidebar - Current Player + Controls */}
      <div className="lg:w-80">
        <GameSidebar
          gameState={effectiveGameState!}
          gameId={gameId}
          isLocalGame={isLocalGame}
          onResign={!isGameOver && !isLocalGame ? handleResign : undefined}
          onMoveSelect={handleMoveSelect}
          currentMoveIndex={currentMoveIndex ?? undefined}
          onReturnToLive={isNavigating ? handleReturnToLive : undefined}
        />
      </div>
    </div>
  );
}