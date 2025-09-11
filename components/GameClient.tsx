"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";
import { formatClockTime } from "@/lib/clock-calculator";
import { BanChess } from "ban-chess.ts";
import type { Move, Ban } from "@/lib/game-types";
import GameSidebar from "./game/GameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import WebSocketStats from "./WebSocketStats";
import DebugPanel from "./game/DebugPanel";

const ResizableBoard = dynamic(
  () =>
    import("@/components/game/ResizableBoard").catch((err) => {
      console.error("Failed to load chess board:", err);
      // Return a fallback component
      return {
        default: () => (
          <div className="chess-board-wrapper">
            <div className="chess-board-container flex items-center justify-center">
              <div className="bg-background-secondary rounded-lg p-8 text-center">
                <p className="text-foreground-muted mb-4">
                  Chess board failed to load
                </p>
                <p className="text-sm text-foreground-muted mb-4">
                  This may be a compatibility issue
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        ),
      };
    }),
  {
    ssr: false,
    loading: () => {
      // Get saved board size from localStorage or use default
      const DEFAULT_SIZE = 600;
      const savedSize =
        typeof window !== "undefined"
          ? localStorage.getItem("boardSize")
          : null;
      const boardSize = savedSize ? parseInt(savedSize, 10) : DEFAULT_SIZE;

      return (
        <div className="chess-board-wrapper">
          <div
            className="chess-board-container flex items-center justify-center"
            style={{
              width: `${boardSize}px`,
              height: `${boardSize}px`,
              background: "var(--background-tertiary)",
              borderRadius: "1rem",
              padding: "16px",
            }}
          >
            <div className="loading-spinner" />
          </div>
        </div>
      );
    },
  }
);

// Mobile board component - responsive sizing
const MobileBoard = dynamic(() => import("@/components/game/MobileBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-full" style={{ maxWidth: "min(100vw - 2rem, 600px)" }}>
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        <div className="absolute inset-0 flex items-center justify-center bg-background-tertiary rounded-lg">
          <div className="loading-spinner" />
        </div>
      </div>
    </div>
  ),
});

interface GameClientProps {
  gameId: string;
}

export default function GameClient({ gameId }: GameClientProps) {
  const {
    gameState,
    game, // BanChess instance
    dests, // Legal moves map
    activePlayer, // From BanChess
    actionType, // From BanChess
    error,
    connected,
    sendAction,
    joinGame,
    giveTime,
    resignGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    isLocalGame,
  } = useGameState();
  const { user } = useAuth();
  const {
    orientation: contextOrientation,
    autoFlipEnabled,
    isLocalGame: isLocal,
    setAutoFlipEnabled,
    banDifficulty,
  } = useUserRole();
  const [hasJoined, setHasJoined] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [navigationGame, setNavigationGame] = useState<BanChess | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [manualBoardOrientation, setManualBoardOrientation] = useState<
    "white" | "black" | null
  >(null);
  const router = useRouter();
  const joinedGameId = useRef<string | null>(null);

  // Determine the board orientation
  const boardOrientation = useCallback(() => {
    // If viewing history or manual orientation is set, use that
    if (manualBoardOrientation !== null) {
      return manualBoardOrientation;
    }
    // In local games with auto-flip enabled, use the context orientation
    if (isLocal && autoFlipEnabled) {
      return contextOrientation;
    }
    // Otherwise use context orientation (for online games or disabled auto-flip)
    return contextOrientation;
  }, [isLocal, autoFlipEnabled, contextOrientation, manualBoardOrientation])();

  // Check for debug mode in URL or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get("debug") === "true";
    const debugStorage = localStorage.getItem("debugMode") === "true";
    setDebugMode(debugParam || debugStorage);
  }, []);

  // Detect mobile screen size for conditional rendering
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Join game when component mounts and we're connected
  useEffect(() => {
    // Only join if we're connected, have a gameId, and haven't joined this specific game
    if (connected && gameId && joinedGameId.current !== gameId) {
      console.log("[GameClient] Joining game:", gameId);
      joinGame(gameId);
      joinedGameId.current = gameId;
      setHasJoined(true);
    }

    // Reset join state if disconnected
    if (!connected && hasJoined) {
      setHasJoined(false);
      // Don't reset joinedGameId here - we want to avoid rejoining the same game
    }
  }, [connected, gameId, hasJoined, joinGame]);

  // Handle move selection for navigation
  const handleMoveSelect = useCallback(
    (moveIndex: number) => {
      if (!gameState?.history || !gameState.history.length) return;

      // Set the current move index for highlighting
      setCurrentMoveIndex(moveIndex);

      // Use BCN actionHistory if available for precise position reconstruction
      if (gameState.actionHistory && gameState.actionHistory.length > 0) {
        // Check if we're navigating to the current position
        const isAtCurrentPosition =
          moveIndex === gameState.actionHistory.length - 1;

        if (isAtCurrentPosition) {
          // Return to live position
          setNavigationGame(null);
          setIsViewingHistory(false);
          console.log("Returned to current position");
        } else {
          // Get BCN actions up to the selected move
          const bcnActions =
            moveIndex >= 0
              ? gameState.actionHistory.slice(0, moveIndex + 1)
              : [];

          if (bcnActions.length > 0) {
            // Reconstruct the game at the selected position
            const navGame = BanChess.replayFromActions(bcnActions);
            setNavigationGame(navGame);
            setIsViewingHistory(true);
            console.log(
              `Navigated to move ${moveIndex + 1} of ${
                gameState.actionHistory.length
              }`
            );
            console.log(`Position FEN: ${navGame.fen()}`);
          } else {
            // Show starting position
            const navGame = new BanChess();
            setNavigationGame(navGame);
            setIsViewingHistory(true);
            console.log("Showing starting position");
          }
        }
      } else {
        // Fallback if actionHistory not available
        console.log(
          `Navigate to move ${moveIndex} - BCN history not available`
        );
        setNavigationGame(null);
        setIsViewingHistory(false);
      }
    },
    [gameState]
  );

  // Reset navigation when game state updates (new moves arrive)
  useEffect(() => {
    if (gameState?.history) {
      // If we're at the last move or no move selected, follow the game
      if (
        currentMoveIndex === null ||
        currentMoveIndex === gameState.history.length - 1
      ) {
        setCurrentMoveIndex(null);
        setNavigationGame(null);
        setIsViewingHistory(false);
      }
    }
  }, [gameState?.history?.length, currentMoveIndex, gameState?.history]);

  // Function to return to live position
  const returnToLive = useCallback(() => {
    if (!gameState?.actionHistory) return;

    setCurrentMoveIndex(gameState.actionHistory.length - 1);
    setNavigationGame(null);
    setIsViewingHistory(false);
  }, [gameState?.actionHistory]);

  // Determine the user's role/color in the game
  const userRole =
    user && gameState ? getUserRole(gameState, user.userId) : null;
  const userColor = userRole?.role; // "white", "black", or null for spectator

  // Only allow moves/bans if it's the player's turn
  const handleMove = (move: Move) => {
    // In local games, always allow moves
    if (isLocalGame) {
      sendAction({ move });
      return;
    }

    // In online games, only allow if it's your turn
    if (userColor !== activePlayer) {
      console.log(
        "[GameClient] Not your turn. You are:",
        userColor,
        "Active:",
        activePlayer
      );
      return;
    }

    sendAction({ move });
  };

  const handleBan = (ban: Ban) => {
    // In local games, always allow bans
    if (isLocalGame) {
      sendAction({ ban });
      return;
    }

    // In online games, only allow if it's your turn
    if (userColor !== activePlayer) {
      console.log(
        "[GameClient] Not your turn. You are:",
        userColor,
        "Active:",
        activePlayer
      );
      return;
    }

    sendAction({ ban });
  };
  const handleNewGame = () => router.push("/");

  // Loading states
  if (!connected) {
    return <LoadingMessage message="Connecting..." />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!gameState || gameState.gameId !== gameId) {
    // Show centered loading message while joining game
    return <LoadingMessage message="Joining game..." />;
  }

  // Conditionally render based on screen size to prevent duplicate components
  if (isMobile) {
    // Extract player information and clocks
    const topPlayer =
      boardOrientation === "white"
        ? gameState.players.black?.username || "Waiting..."
        : gameState.players.white?.username || "Waiting...";
    const bottomPlayer =
      boardOrientation === "white"
        ? gameState.players.white?.username || "Waiting..."
        : gameState.players.black?.username || "Waiting...";

    const topClock =
      boardOrientation === "white"
        ? gameState.clocks?.black
        : gameState.clocks?.white;
    const bottomClock =
      boardOrientation === "white"
        ? gameState.clocks?.white
        : gameState.clocks?.black;

    const isTopActive =
      boardOrientation === "white"
        ? activePlayer === "black"
        : activePlayer === "white";
    const isBottomActive = !isTopActive;

    return (
      <>
        {/* Mobile Layout - Board-focused with player cards */}
        <div className="flex flex-col h-[100dvh] bg-background">
          {/* Top player card */}
          <div className="flex-shrink-0 bg-background-secondary border-b border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isTopActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                <span className="font-medium text-sm">{topPlayer}</span>
              </div>
              {topClock !== undefined && gameState.timeControl && (
                <div
                  className={`font-mono text-sm px-2 py-1 rounded ${
                    isTopActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatClockTime(topClock.remaining)}
                </div>
              )}
            </div>
          </div>

          {/* Board container - flex-grow to fill available space */}
          <div className="flex-grow flex items-center justify-center p-2 min-h-0">
            <MobileBoard
              gameState={
                navigationGame
                  ? {
                      ...gameState,
                      fen: navigationGame.fen(),
                      inCheck: navigationGame.inCheck(),
                    }
                  : gameState
              }
              dests={navigationGame ? new Map() : dests}
              activePlayer={
                navigationGame ? navigationGame.getActivePlayer() : activePlayer
              }
              actionType={
                navigationGame ? navigationGame.getActionType() : actionType
              }
              onMove={handleMove}
              onBan={handleBan}
              refreshKey={boardRefreshKey}
              orientation={boardOrientation}
              canInteract={
                navigationGame
                  ? false
                  : isLocalGame || userColor === activePlayer
              }
              banDifficulty={banDifficulty}
            />
          </div>

          {/* Bottom player card */}
          <div className="flex-shrink-0 bg-background-secondary border-t border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isBottomActive
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
                <span className="font-medium text-sm">{bottomPlayer}</span>
              </div>
              {bottomClock !== undefined && gameState.timeControl && (
                <div
                  className={`font-mono text-sm px-2 py-1 rounded ${
                    isBottomActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatClockTime(bottomClock.remaining)}
                </div>
              )}
            </div>
          </div>

          {/* Minimal game status bar */}
          <div className="flex-shrink-0 bg-background-tertiary px-3 py-2 border-t border-border">
            <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop Layout - Three column layout with centered board */}
      <div
        className={`flex-grow flex justify-center items-center min-h-0 ${
          debugMode ? "border-4 border-red-500 relative" : ""
        }`}
      >
        {debugMode && (
          <div className="absolute top-0 left-0 bg-red-500 text-white p-2 z-50">
            OUTER CONTAINER
          </div>
        )}
        <div
          className={`flex gap-6 items-center justify-center w-full max-w-[1400px] p-4 h-full ${
            debugMode ? "border-4 border-blue-500 relative" : ""
          }`}
        >
          {debugMode && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-2 z-50">
              GRID CONTAINER
            </div>
          )}

          {/* Left Panel - Status */}
          <div
            className={`w-56 flex-shrink-0 ${
              debugMode ? "border-4 border-green-500 relative" : ""
            }`}
          >
            {debugMode && (
              <div className="absolute top-0 left-0 bg-green-500 text-white p-1 z-50">
                LEFT
              </div>
            )}
            <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
          </div>

          {/* Center - Board */}
          <div
            className={`flex flex-col items-center justify-center ${
              debugMode ? "border-4 border-yellow-500 relative" : ""
            }`}
          >
            {debugMode && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-500 text-black p-1 z-50">
                CENTER
              </div>
            )}
            <ResizableBoard
              gameState={
                navigationGame
                  ? {
                      ...gameState,
                      fen: navigationGame.fen(),
                      inCheck: navigationGame.inCheck(),
                    }
                  : gameState
              }
              dests={navigationGame ? new Map() : dests}
              activePlayer={
                navigationGame ? navigationGame.getActivePlayer() : activePlayer
              }
              actionType={
                navigationGame ? navigationGame.getActionType() : actionType
              }
              onMove={handleMove}
              onBan={handleBan}
              refreshKey={boardRefreshKey}
              orientation={boardOrientation}
              canInteract={
                navigationGame
                  ? false
                  : isLocalGame || userColor === activePlayer
              }
              banDifficulty={banDifficulty}
            />
          </div>

          {/* Right Panel - Sidebar - Made wider for move list */}
          <div
            className={`w-80 flex-shrink-0 ${
              debugMode ? "border-4 border-purple-500 relative" : ""
            }`}
          >
            {debugMode && (
              <div className="absolute top-0 right-0 bg-purple-500 text-white p-1 z-50">
                RIGHT
              </div>
            )}
            <GameSidebar
              gameState={gameState}
              onGiveTime={giveTime}
              onResign={resignGame}
              onOfferDraw={offerDraw}
              onAcceptDraw={acceptDraw}
              onDeclineDraw={declineDraw}
              onMoveSelect={handleMoveSelect}
              currentMoveIndex={currentMoveIndex ?? undefined}
              isLocalGame={isLocalGame}
              onFlipBoard={() => {
                if (isLocal && !autoFlipEnabled) {
                  // In local games with auto-flip disabled, toggle manual orientation
                  setManualBoardOrientation((prev) =>
                    prev === null
                      ? contextOrientation === "white"
                        ? "black"
                        : "white"
                      : prev === "white"
                      ? "black"
                      : "white"
                  );
                } else if (!isLocal) {
                  // In non-local games, always toggle manual orientation
                  setManualBoardOrientation((prev) =>
                    prev === null
                      ? contextOrientation === "white"
                        ? "black"
                        : "white"
                      : prev === "white"
                      ? "black"
                      : "white"
                  );
                }
              }}
              onToggleAutoFlip={
                isLocal
                  ? () => {
                      // In local games, we can toggle auto-flip
                      setAutoFlipEnabled(!autoFlipEnabled);
                      // Reset manual orientation when enabling auto-flip
                      if (!autoFlipEnabled) {
                        setManualBoardOrientation(null);
                      }
                    }
                  : undefined
              }
              autoFlipEnabled={autoFlipEnabled}
              isViewingHistory={isViewingHistory}
              onReturnToLive={returnToLive}
            />
          </div>
        </div>

        {/* Debug toggle button */}
        <button
          onClick={() => {
            const newDebugMode = !debugMode;
            setDebugMode(newDebugMode);
            localStorage.setItem("debugMode", newDebugMode.toString());
          }}
          className="fixed bottom-4 right-4 p-2 bg-background-secondary rounded-lg text-xs opacity-50 hover:opacity-100 transition-opacity"
        >
          {debugMode ? "Hide" : "Show"} Debug
        </button>
      </div>
      <WebSocketStats />
      {debugMode && (
        <DebugPanel
          gameState={gameState}
          game={game}
          dests={dests}
          onRefreshBoard={() => setBoardRefreshKey((prev) => prev + 1)}
        />
      )}
    </>
  );
}

// Simple loading component
function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}

// Simple error component
function ErrorMessage({ error }: { error: { type: string; message: string } }) {
  let title = "An unexpected error occurred.";
  let description = error.message;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let actionButton: any = null;

  switch (error.type) {
    case "network":
      title = "Connection Error";
      description =
        "Could not connect to the game server. Please check your internet connection or try again later.";
      actionButton = (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600"
        >
          Reload Page
        </button>
      );
      break;
    case "auth":
      title = "Authentication Required";
      description =
        "You need to be logged in to perform this action. Please refresh the page or log in again.";
      actionButton = (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600"
        >
          Reload Page
        </button>
      );
      break;
    case "game":
      title = "Game Error";
      description = `There was an issue with the game state: ${error.message}.`;
      actionButton = (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600"
        >
          Start New Game
        </button>
      );
      break;
    default:
      // Use default title and description
      break;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center text-destructive p-6 rounded-lg shadow-xl bg-background-secondary">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-base mb-4">{description}</p>
        {actionButton}
      </div>
    </div>
  );
}
