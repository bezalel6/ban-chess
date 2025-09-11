"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";
import { formatClockTime } from "@/lib/clock-calculator";
import { BanChess } from "ban-chess.ts";
import type { Move, Ban, PlayerClock, HistoryEntry } from "@/lib/game-types";
import GameSidebar from "./game/GameSidebar";
import CompletedGameSidebar from "./game/CompletedGameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import WebSocketStats from "./WebSocketStats";
import DebugPanel from "./game/DebugPanel";

// Dynamically load board components
const ResizableBoard = dynamic(
  () =>
    import("@/components/game/ResizableBoard").catch((err) => {
      console.error("Failed to load chess board:", err);
      return {
        default: () => (
          <div className="chess-board-wrapper">
            <div className="chess-board-container flex items-center justify-center">
              <div className="bg-background-secondary rounded-lg p-8 text-center">
                <p className="text-foreground-muted mb-4">
                  Chess board failed to load
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

// Component for loading messages
function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p className="text-foreground-muted">{message}</p>
      </div>
    </div>
  );
}

// Component for error messages
function ErrorMessage({ error }: { error: { message: string } }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400 font-semibold mb-4">Error</p>
        <p className="text-foreground-muted">{error.message}</p>
      </div>
    </div>
  );
}

type GameViewMode = 'default' | 'compact' | 'thumbnail' | 'minimal' | 'zen';

interface GameViewerProps {
  gameId: string;
  mode?: GameViewMode;
  thumbnailSize?: number; // For thumbnail mode
  onThumbnailClick?: () => void; // For thumbnail mode
  viewOptions?: {
    showSidebar?: boolean;
    showControls?: boolean;
    showHistory?: boolean;
    showStats?: boolean;
    showDebug?: boolean;
  };
}

/**
 * Unified game viewer component that handles all game viewing needs:
 * - Live games (multiplayer and solo)
 * - Completed games (with history navigation)
 * - Thumbnail previews
 * - Compact and minimal views
 * Follows Lichess-style pattern for seamless game experience.
 */
export default function GameViewer({ 
  gameId, 
  mode = 'default',
  thumbnailSize = 200,
  onThumbnailClick,
  viewOptions = {}
}: GameViewerProps) {
  const {
    gameState,
    game, // BanChess instance
    dests, // Legal moves map
    activePlayer,
    actionType,
    ply: _ply,
    sendAction,
    connected,
    error,
    isLocalGame,
  } = useGameState(gameId);

  const router = useRouter();
  const { user } = useAuth();
  const { role: contextRole } = useUserRole();
  
  // State for board orientation and navigation
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [navigationGame, setNavigationGame] = useState<BanChess | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDebug, setShowDebug] = useState(viewOptions.showDebug ?? false);
  const [historicalClocks, setHistoricalClocks] = useState<{ white: PlayerClock; black: PlayerClock } | null>(null);
  
  // Track if game was already over when we loaded (for completed games from database)
  const [initiallyCompleted, setInitiallyCompleted] = useState(false);
  const gameEndedRef = useRef(false);
  
  // State for the full history (preserved during navigation)
  const [fullHistory, setFullHistory] = useState<HistoryEntry[]>([]);
  
  // Determine effective view options based on mode
  const effectiveViewOptions = useMemo(() => {
    if (mode === 'thumbnail') {
      return {
        showSidebar: false,
        showControls: false,
        showHistory: false,
        showStats: false,
        showDebug: false
      };
    } else if (mode === 'minimal') {
      return {
        showSidebar: false,
        showControls: true,
        showHistory: false,
        showStats: false,
        showDebug: false
      };
    } else if (mode === 'compact') {
      return {
        showSidebar: viewOptions.showSidebar ?? false,
        showControls: viewOptions.showControls ?? true,
        showHistory: viewOptions.showHistory ?? false,
        showStats: viewOptions.showStats ?? false,
        showDebug: viewOptions.showDebug ?? false
      };
    } else if (mode === 'zen') {
      return {
        showSidebar: false,
        showControls: false,
        showHistory: false,
        showStats: false,
        showDebug: false
      };
    }
    // Default mode
    return {
      showSidebar: viewOptions.showSidebar ?? true,
      showControls: viewOptions.showControls ?? true,
      showHistory: viewOptions.showHistory ?? true,
      showStats: viewOptions.showStats ?? true,
      showDebug: viewOptions.showDebug ?? false
    };
  }, [mode, viewOptions]);
  
  // Note: Database games are now loaded through WebSocket following Lichess patterns
  // No client-side database state is needed

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set board orientation based on user role
  useEffect(() => {
    if (contextRole === "black") {
      setBoardOrientation("black");
    } else {
      setBoardOrientation("white");
    }
  }, [contextRole]);

  // Create effective game state with preserved full history
  const effectiveGameState = useMemo(() => {
    if (!gameState) return null;
    
    // If we have a full history stored, use it instead of the potentially truncated one
    if (fullHistory.length > 0 && gameState.gameOver) {
      return {
        ...gameState,
        history: fullHistory
      };
    }
    
    return gameState;
  }, [gameState, fullHistory]);

  // Check if game is completed on initial load and store full history
  useEffect(() => {
    if (gameState && !initiallyCompleted) {
      if (gameState.gameOver || gameState.dataSource === 'completed') {
        setInitiallyCompleted(true);
        console.log("[GameViewer] Game loaded as completed");
      }
    }
    
    // Store the full history from WebSocket game state
    if (gameState?.history && gameState.history.length > 0) {
      // History is already in HistoryEntry format or string format
      // For now, just store if it's HistoryEntry format
      if (typeof gameState.history[0] !== 'string') {
        setFullHistory(gameState.history as HistoryEntry[]);
      }
      // Note: String format history would need proper conversion with game reconstruction
    }
  }, [gameState, initiallyCompleted]);

  // Note: Following Lichess patterns, all game retrieval happens through WebSocket
  // The server's join-game handler will check both Redis and database
  // No client-side database fetching is needed

  // Handle game ending transition
  useEffect(() => {
    if (gameState?.gameOver && !gameEndedRef.current && !initiallyCompleted) {
      gameEndedRef.current = true;
      console.log("[GameViewer] Game just ended! Transitioning to completed view...");
      
      // Play end game sound if available
      // Sound will be handled by the useGameState hook when it receives the game-ended message
      
      // Show notification about game ending
      if (gameState.result) {
        const notification = `Game Over: ${gameState.result}`;
        // You could show a toast notification here
        console.log(notification);
      }
    }
  }, [gameState?.gameOver, gameState?.result, initiallyCompleted]);

  // Determine if game is live or completed
  const isGameLive = effectiveGameState && !effectiveGameState.gameOver;
  const isGameCompleted = effectiveGameState?.gameOver === true;

  // Determine user's role/color in the game
  const userRole = user && effectiveGameState ? getUserRole(effectiveGameState, user.userId) : null;
  const userColor = userRole?.role; // "white", "black", or null for spectator

  // Navigation functions for move history
  const handleNavigate = useCallback(
    (moveIndex: number) => {
      const actionHistory = effectiveGameState?.actionHistory;
      if (!actionHistory) return;

      const isAtCurrentPosition = moveIndex === actionHistory.length - 1;

      if (isAtCurrentPosition) {
        // Return to live position
        setNavigationGame(null);
        setIsViewingHistory(false);
        setHistoricalClocks(null);
      } else {
        // Navigate to historical position
        const bcnActions = moveIndex >= 0 
          ? actionHistory.slice(0, moveIndex + 1)
          : [];

        if (bcnActions.length > 0) {
          const navGame = BanChess.replayFromActions(bcnActions);
          setNavigationGame(navGame);
          setIsViewingHistory(true);
          
          // Calculate clocks for this position if it's a completed game
          // Note: moveTimes might not be available in the current SimpleGameState type
          // This feature will be added when we have proper move time tracking
          if (isGameCompleted && effectiveGameState.timeControl) {
            // TODO: Add move time tracking to calculate historical clocks
            const clocks = null;
            setHistoricalClocks(clocks);
          }
        } else {
          // Starting position
          const navGame = new BanChess();
          setNavigationGame(navGame);
          setIsViewingHistory(true);
          setHistoricalClocks(null);
        }
      }
      
      setCurrentMoveIndex(moveIndex);
    },
    [effectiveGameState, isGameCompleted]
  );

  // Return to live position
  const returnToLive = useCallback(() => {
    const actionHistory = effectiveGameState?.actionHistory;
    if (!actionHistory) return;
    setCurrentMoveIndex(actionHistory.length - 1);
    setNavigationGame(null);
    setIsViewingHistory(false);
    setHistoricalClocks(null);
  }, [effectiveGameState?.actionHistory]);

  // Handle moves (only for live games)
  const handleMove = (move: Move) => {
    if (!isGameLive) return;

    // In local games, always allow moves
    if (isLocalGame) {
      sendAction({ move });
      return;
    }

    // In online games, only allow if it's your turn
    if (userColor !== activePlayer) {
      console.log("[GameViewer] Not your turn");
      return;
    }

    sendAction({ move });
  };

  // Handle bans (only for live games)
  const handleBan = (ban: Ban) => {
    if (!isGameLive) return;

    // In local games, always allow bans
    if (isLocalGame) {
      sendAction({ ban });
      return;
    }

    // In online games, only allow if it's your turn
    if (userColor !== activePlayer) {
      console.log("[GameViewer] Not your turn");
      return;
    }

    sendAction({ ban });
  };

  const handleNewGame = () => router.push("/");
  const handleFlipBoard = () => setBoardOrientation(prev => prev === "white" ? "black" : "white");

  // Loading states
  if (!connected && !initiallyCompleted) {
    return <LoadingMessage message="Connecting to server..." />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!effectiveGameState) {
    // Show more specific loading message
    const loadingMsg = connected 
      ? `Loading game ${gameId}...` 
      : "Waiting for connection...";
    return <LoadingMessage message={loadingMsg} />;
  }

  // Determine which board to display (navigation or live)
  const displayGame = navigationGame || game;
  const displayFen = navigationGame ? navigationGame.fen() : effectiveGameState.fen;
  const displayActivePlayer = navigationGame 
    ? navigationGame.getActivePlayer() as "white" | "black"
    : activePlayer || "white";
  const displayActionType = navigationGame
    ? navigationGame.getActionType() as "move" | "ban"
    : actionType || "move";
  const displayDests = isViewingHistory || isGameCompleted 
    ? new Map() // No moves allowed when viewing history or completed games
    : dests;
  const displayClocks = historicalClocks || effectiveGameState.clocks;

  // Thumbnail mode - simplified board only view
  if (mode === 'thumbnail') {
    return (
      <div 
        className="relative cursor-pointer"
        style={{ width: thumbnailSize, height: thumbnailSize }}
        onClick={onThumbnailClick}
      >
        <div className="absolute inset-0 bg-background-secondary rounded-lg overflow-hidden">
          <ResizableBoard
            gameState={{ ...effectiveGameState, fen: displayFen, inCheck: displayGame?.inCheck() || false }}
            dests={new Map()} // No moves in thumbnail
            activePlayer={undefined}
            actionType={undefined}
            onMove={() => {}}
            onBan={() => {}}
            refreshKey={0}
            orientation="white"
          />
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    const topPlayer =
      boardOrientation === "white"
        ? effectiveGameState.players.black?.username || "Waiting..."
        : effectiveGameState.players.white?.username || "Waiting...";
    const bottomPlayer =
      boardOrientation === "white"
        ? effectiveGameState.players.white?.username || "Waiting..."
        : effectiveGameState.players.black?.username || "Waiting...";

    const topClock = boardOrientation === "white" 
      ? displayClocks?.black 
      : displayClocks?.white;
    const bottomClock = boardOrientation === "white"
      ? displayClocks?.white
      : displayClocks?.black;

    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <div className="w-full max-w-[600px] flex flex-col gap-2">
            {/* Top player info */}
            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-medium">{topPlayer}</span>
              {topClock && (
                <span className="text-sm font-mono">
                  {formatClockTime(topClock.remaining)}
                </span>
              )}
            </div>

            {/* Board */}
            <MobileBoard
              gameState={{ ...effectiveGameState, fen: displayFen }}
              dests={displayDests}
              activePlayer={displayActivePlayer}
              actionType={displayActionType}
              onMove={handleMove}
              onBan={handleBan}
              refreshKey={0}
              orientation={boardOrientation}
            />

            {/* Bottom player info */}
            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-medium">{bottomPlayer}</span>
              {bottomClock && (
                <span className="text-sm font-mono">
                  {formatClockTime(bottomClock.remaining)}
                </span>
              )}
            </div>
          </div>

          {/* Mobile game controls */}
          <div className="w-full max-w-[600px] flex gap-2">
            <button
              onClick={handleFlipBoard}
              className="flex-1 px-3 py-2 bg-background-secondary rounded-lg text-sm"
            >
              Flip Board
            </button>
            <button
              onClick={handleNewGame}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex-grow flex justify-center items-center min-h-0">
      <div className="flex gap-6 items-center justify-center w-full max-w-[1400px] p-4 h-full">
        
        {/* Left Panel - Status */}
        {effectiveViewOptions.showControls && (
          <div className="w-56 flex-shrink-0">
            <GameStatusPanel 
              gameState={effectiveGameState}
              activePlayer={displayActivePlayer}
              actionType={displayActionType}
              isOfflineGame={isLocalGame}
              onNewGame={handleNewGame}
            />
          </div>
        )}

        {/* Center - Board */}
        <div className="flex flex-col items-center justify-center gap-2">
          <ResizableBoard
            gameState={{ ...effectiveGameState, fen: displayFen, inCheck: displayGame?.inCheck() || false }}
            dests={displayDests}
            activePlayer={displayActivePlayer}
            actionType={displayActionType}
            onMove={handleMove}
            onBan={handleBan}
            refreshKey={0}
            orientation={boardOrientation}
          />
          {/* Debug toggle button */}
          {effectiveViewOptions.showDebug && !isGameCompleted && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-3 py-1 text-xs bg-background-secondary rounded hover:bg-background-tertiary transition-colors"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          )}
        </div>

        {/* Right Panel - Sidebar */}
        {effectiveViewOptions.showSidebar && (
          <div className="w-80 flex-shrink-0">
            {isGameCompleted ? (
              <CompletedGameSidebar
                gameState={{ ...effectiveGameState, clocks: displayClocks }}
                onMoveSelect={handleNavigate}
                currentMoveIndex={currentMoveIndex ?? undefined}
                onFlipBoard={handleFlipBoard}
                isViewingHistory={isViewingHistory}
              />
            ) : (
              <GameSidebar
                gameState={{ ...effectiveGameState, clocks: displayClocks }}
                onFlipBoard={handleFlipBoard}
                isViewingHistory={isViewingHistory}
                onMoveSelect={handleNavigate}
                currentMoveIndex={currentMoveIndex ?? undefined}
                onReturnToLive={returnToLive}
              />
            )}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {effectiveViewOptions.showDebug && showDebug && !isGameCompleted && game && (
        <div className="fixed bottom-4 right-4">
          <DebugPanel gameState={effectiveGameState} game={game} dests={dests} />
        </div>
      )}

      {/* WebSocket Stats */}
      {effectiveViewOptions.showStats && !isGameCompleted && (
        <div className="fixed bottom-4 left-4">
          <WebSocketStats />
        </div>
      )}
    </div>
  );
}