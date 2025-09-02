"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useOfflineGame } from "@/hooks/useOfflineGame";
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
                  This may be a compatibility issue with React 19
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
    loading: () => (
      <div className="chess-board-wrapper">
        <div className="chess-board-container flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      </div>
    ),
  },
);

interface GameClientProps {
  gameId: string;
}

export default function GameClient({ gameId }: GameClientProps) {
  const searchParams = useSearchParams();
  const isOfflineMode = searchParams.get('mode') === 'offline' || gameId.startsWith('offline-');
  
  // Use appropriate hook based on game mode
  const onlineGameState = useGameState();
  const offlineGameState = useOfflineGame();
  
  // Select the appropriate state based on mode
  const {
    gameState,
    game,  // BanChess instance
    dests, // Legal moves map
    activePlayer, // From BanChess
    actionType, // From BanChess  
    error,
    connected,
    sendAction,
    joinGame,
    gameEvents,
    giveTime,
    resignGame,
  } = isOfflineMode ? {
    ...offlineGameState,
    joinGame: () => {}, // No-op for offline games
    giveTime: () => {}, // No-op for offline games
  } : onlineGameState;
  const [hasJoined, setHasJoined] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const router = useRouter();
  const joinedGameId = useRef<string | null>(null);

  // Check for debug mode in URL or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get("debug") === "true";
    const debugStorage = localStorage.getItem("debugMode") === "true";
    setDebugMode(debugParam || debugStorage);
  }, []);

  // Join game when component mounts and we're connected (or create offline game)
  useEffect(() => {
    if (isOfflineMode) {
      // For offline games, create the game if not already done
      if (joinedGameId.current !== gameId && !offlineGameState.gameState) {
        console.log("[GameClient] Creating offline game:", gameId);
        offlineGameState.createOfflineGame(gameId);
        joinedGameId.current = gameId;
        setHasJoined(true);
      }
    } else {
      // For online games, join when connected
      if (connected && gameId && joinedGameId.current !== gameId) {
        console.log("[GameClient] Joining online game:", gameId);
        joinGame(gameId);
        joinedGameId.current = gameId;
        setHasJoined(true);
      }

      // Reset join state if disconnected
      if (!connected && hasJoined) {
        setHasJoined(false);
        // Don't reset joinedGameId here - we want to avoid rejoining the same game
      }
    }
  }, [connected, gameId, hasJoined, joinGame, isOfflineMode, offlineGameState]);

  const handleMove = (move: Move) => sendAction({ move });
  const handleBan = (ban: Ban) => sendAction({ ban });
  const handleNewGame = () => router.push("/");

  // Loading states
  if (isOfflineMode) {
    // For offline games, check if we have a game state
    if (!gameState) {
      return <LoadingMessage message="Creating offline game..." />;
    }
  } else {
    // For online games, check connection and game state
    if (!connected) {
      return <LoadingMessage message="Connecting..." />;
    }

    if (!gameState || gameState.gameId !== gameId) {
      return <LoadingMessage message="Joining game..." />;
    }
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <>
      {/* Desktop Layout - Three column layout with centered board */}
      <div
        className={`hidden md:flex justify-center items-center p-2 ${
          debugMode ? "border-4 border-red-500 relative" : ""
        }`}
      >
        {debugMode && (
          <div className="absolute top-0 left-0 bg-red-500 text-white p-2 z-50">
            OUTER CONTAINER
          </div>
        )}
        <div
          className={`grid grid-cols-[14rem_auto_18rem] gap-3 items-center max-h-[calc(100vh-1rem)] ${
            debugMode ? "border-4 border-blue-500 relative" : ""
          }`}
        >
          {debugMode && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-2 z-50">
              GRID CONTAINER
            </div>
          )}

          {/* Left Panel - Fixed width, aligned with board */}
          <div
            className={`h-fit ${
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
            className={`flex justify-center ${
              debugMode ? "border-4 border-yellow-500 relative" : ""
            }`}
          >
            {debugMode && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-500 text-black p-1 z-50">
                CENTER
              </div>
            )}
            <ResizableBoard
              gameState={gameState}
              game={game}
              dests={dests}
              activePlayer={activePlayer}
              actionType={actionType}
              onMove={handleMove}
              onBan={handleBan}
              refreshKey={boardRefreshKey}
            />
          </div>

          {/* Right Panel - Fixed width, vertically centered */}
          <div
            className={`flex items-center justify-center ${
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
              gameEvents={gameEvents}
              onGiveTime={giveTime}
              onResign={resignGame}
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

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col gap-4 p-4">
        <ResizableBoard
          gameState={gameState}
          game={game}
          dests={dests}
          activePlayer={activePlayer}
          actionType={actionType}
          onMove={handleMove}
          onBan={handleBan}
          refreshKey={boardRefreshKey}
        />
        <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
        <GameSidebar
          gameState={gameState}
          gameEvents={gameEvents}
          onGiveTime={giveTime}
        />
      </div>
      {!isOfflineMode && <WebSocketStats />}
      {debugMode && (
        <DebugPanel 
          gameState={gameState} 
          game={game} 
          dests={dests}
          onRefreshBoard={() => setBoardRefreshKey(prev => prev + 1)}
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
      description = "Could not connect to the game server. Please check your internet connection or try again later.";
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
      description = "You need to be logged in to perform this action. Please refresh the page or log in again.";
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
