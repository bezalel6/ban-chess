"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";
import { formatClockTime } from "@/lib/clock-calculator";
import type { Move, Ban } from "@/lib/game-types";
import GameSidebar from "./game/GameSidebar";
import GameStatusPanel from "./game/GameStatusPanel";
import { Settings2, Eye, Zap, Users } from "lucide-react";

const ResizableBoard = dynamic(
  () => import("@/components/game/ResizableBoard"),
  { ssr: false }
);

interface CompactGameClientProps {
  gameId: string;
  thumbnailMode?: boolean;  // Show as a static thumbnail of final position
  thumbnailSize?: number;    // Size in pixels for thumbnail mode
  onThumbnailClick?: () => void;  // Optional click handler for thumbnail
}

type ViewMode = "spectate" | "minimal" | "zen" | "custom" | "thumbnail";

interface ViewConfig {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  showPlayerNames: boolean;
  showClocks: boolean;
  showActions: boolean;
  showMovesList: boolean;
}

const VIEW_PRESETS: Record<ViewMode, ViewConfig> = {
  spectate: {
    showLeftSidebar: false,
    showRightSidebar: false,
    showPlayerNames: true,
    showClocks: true,
    showActions: false,
    showMovesList: false,
  },
  minimal: {
    showLeftSidebar: false,
    showRightSidebar: false,
    showPlayerNames: true,
    showClocks: true,
    showActions: true,
    showMovesList: false,
  },
  zen: {
    showLeftSidebar: false,
    showRightSidebar: false,
    showPlayerNames: false,
    showClocks: true,
    showActions: false,
    showMovesList: false,
  },
  custom: {
    showLeftSidebar: true,
    showRightSidebar: true,
    showPlayerNames: true,
    showClocks: true,
    showActions: true,
    showMovesList: true,
  },
  thumbnail: {
    showLeftSidebar: false,
    showRightSidebar: false,
    showPlayerNames: false,
    showClocks: false,
    showActions: false,
    showMovesList: false,
  },
};

export default function CompactGameClient({ 
  gameId, 
  thumbnailMode = false,
  thumbnailSize = 300,
  onThumbnailClick 
}: CompactGameClientProps) {
  const {
    gameState,
    dests,
    activePlayer,
    actionType,
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
  const [hasJoined, setHasJoined] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(thumbnailMode ? "thumbnail" : "spectate");
  const [customConfig, setCustomConfig] = useState<ViewConfig>(VIEW_PRESETS.spectate);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const joinedGameId = useRef<string | null>(null);

  // Get current view config based on mode
  const viewConfig = viewMode === "custom" ? customConfig : VIEW_PRESETS[viewMode];

  // Join game when component mounts
  useEffect(() => {
    if (connected && gameId && joinedGameId.current !== gameId && !hasJoined) {
      joinGame(gameId);
      joinedGameId.current = gameId;
      setHasJoined(true);
    }
    if (!connected && hasJoined) {
      setHasJoined(false);
    }
  }, [connected, gameId, hasJoined, joinGame]);

  // Determine the user's role/color in the game
  const userRole = user && gameState ? getUserRole(gameState, user.userId) : null;
  const userColor = userRole?.role;

  // Check if this is a local test game (same user playing both sides)
  const isLocalTestGame = user && gameState && 
    gameState.players.white?.id === user.userId && 
    gameState.players.black?.id === user.userId;

  // Handle moves and bans
  const handleMove = (move: Move) => {
    if (isLocalGame || isLocalTestGame || userColor === activePlayer) {
      sendAction({ move });
    }
  };

  const handleBan = (ban: Ban) => {
    if (isLocalGame || isLocalTestGame || userColor === activePlayer) {
      sendAction({ ban });
    }
  };

  const handleNewGame = () => router.push("/");

  // Loading states
  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-destructive">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!gameState || gameState.gameId !== gameId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Joining game...</p>
        </div>
      </div>
    );
  }

  const topPlayer = boardOrientation === "white" 
    ? gameState.players.black?.username || "Waiting..."
    : gameState.players.white?.username || "Waiting...";
  const bottomPlayer = boardOrientation === "white"
    ? gameState.players.white?.username || "Waiting..."
    : gameState.players.black?.username || "Waiting...";

  const topClock = boardOrientation === "white"
    ? gameState.clocks?.black
    : gameState.clocks?.white;
  const bottomClock = boardOrientation === "white"
    ? gameState.clocks?.white
    : gameState.clocks?.black;

  const isTopActive = boardOrientation === "white" 
    ? activePlayer === "black"
    : activePlayer === "white";
  const isBottomActive = !isTopActive;

  // Thumbnail mode - simple clickable board showing final position
  if (thumbnailMode) {
    return (
      <div 
        className="relative cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onThumbnailClick}
        style={{ width: thumbnailSize, height: thumbnailSize }}
      >
        <ResizableBoard
          gameState={gameState}
          dests={new Map()} // No moves in thumbnail
          activePlayer={activePlayer}
          actionType={actionType}
          onMove={() => {}} // No moves allowed
          onBan={() => {}} // No bans allowed
          refreshKey={0}
          orientation={boardOrientation}
          canInteract={false} // No interaction in thumbnail
        />
        {gameState.gameOver && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center">
            {gameState.result === "1-0" && "White wins"}
            {gameState.result === "0-1" && "Black wins"}
            {gameState.result === "1/2-1/2" && "Draw"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Settings Panel */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* View Mode Selector */}
        <div className="flex bg-background-secondary rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode("spectate")}
            className={`p-2 rounded ${viewMode === "spectate" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Spectate Mode"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("minimal")}
            className={`p-2 rounded ${viewMode === "minimal" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Minimal Player Mode"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("zen")}
            className={`p-2 rounded ${viewMode === "zen" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Zen Mode"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("custom")}
            className={`p-2 rounded ${viewMode === "custom" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Custom Mode"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Toggle for Custom Mode */}
        {viewMode === "custom" && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-background-secondary rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Custom Settings Panel */}
      {showSettings && viewMode === "custom" && (
        <div className="fixed top-16 right-4 z-40 bg-background-secondary rounded-lg p-4 shadow-lg">
          <h3 className="font-semibold mb-3">Customize View</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showLeftSidebar}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showLeftSidebar: e.target.checked }))}
              />
              <span>Left Sidebar</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showRightSidebar}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showRightSidebar: e.target.checked }))}
              />
              <span>Right Sidebar</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showPlayerNames}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showPlayerNames: e.target.checked }))}
              />
              <span>Player Names</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showClocks}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showClocks: e.target.checked }))}
              />
              <span>Clocks</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showActions}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showActions: e.target.checked }))}
              />
              <span>Game Actions</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customConfig.showMovesList}
                onChange={(e) => setCustomConfig(prev => ({ ...prev, showMovesList: e.target.checked }))}
              />
              <span>Moves List</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Game Layout */}
      <div className="flex flex-1 justify-center items-center gap-4 p-4">
        {/* Left Sidebar */}
        {viewConfig.showLeftSidebar && (
          <div className="w-56 flex-shrink-0">
            <GameStatusPanel gameState={gameState} onNewGame={handleNewGame} />
          </div>
        )}

        {/* Center - Board with overlays */}
        <div className="relative">
          {/* Top Player Info */}
          {viewConfig.showPlayerNames && (
            <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-2">
              <span className="font-medium text-sm">{topPlayer}</span>
              {viewConfig.showClocks && topClock && (
                <div className={`font-mono text-sm px-2 py-1 rounded ${
                  isTopActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {formatClockTime(topClock.remaining)}
                </div>
              )}
            </div>
          )}

          {/* Board */}
          <ResizableBoard
            gameState={gameState}
            dests={dests}
            activePlayer={activePlayer}
            actionType={actionType}
            onMove={handleMove}
            onBan={handleBan}
            refreshKey={0}
            orientation={boardOrientation}
            canInteract={isLocalGame || isLocalTestGame || userColor === activePlayer}
          />

          {/* Bottom Player Info */}
          {viewConfig.showPlayerNames && (
            <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-between px-2">
              <span className="font-medium text-sm">{bottomPlayer}</span>
              {viewConfig.showClocks && bottomClock && (
                <div className={`font-mono text-sm px-2 py-1 rounded ${
                  isBottomActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {formatClockTime(bottomClock.remaining)}
                </div>
              )}
            </div>
          )}

          {/* Clocks Only (Zen Mode) */}
          {viewMode === "zen" && viewConfig.showClocks && (
            <>
              {topClock && (
                <div className={`absolute -top-10 right-0 font-mono text-sm px-2 py-1 rounded ${
                  isTopActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {formatClockTime(topClock.remaining)}
                </div>
              )}
              {bottomClock && (
                <div className={`absolute -bottom-10 right-0 font-mono text-sm px-2 py-1 rounded ${
                  isBottomActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {formatClockTime(bottomClock.remaining)}
                </div>
              )}
            </>
          )}

          {/* Bottom Actions Panel (Minimal Mode) */}
          {viewConfig.showActions && viewMode === "minimal" && (
            <div className="absolute -bottom-20 left-0 right-0 flex justify-center gap-2">
              {resignGame && (
                <button
                  onClick={resignGame}
                  className="p-2 bg-background-secondary rounded-lg text-muted-foreground hover:text-destructive"
                  title="Resign"
                >
                  Resign
                </button>
              )}
              {offerDraw && !gameState.drawOfferedBy && (
                <button
                  onClick={offerDraw}
                  className="p-2 bg-background-secondary rounded-lg text-muted-foreground hover:text-primary"
                  title="Offer Draw"
                >
                  Draw
                </button>
              )}
              {gameState.drawOfferedBy && gameState.drawOfferedBy !== userColor && acceptDraw && (
                <button
                  onClick={acceptDraw}
                  className="p-2 bg-green-500/20 rounded-lg text-green-500"
                >
                  Accept Draw
                </button>
              )}
              {gameState.drawOfferedBy && gameState.drawOfferedBy !== userColor && declineDraw && (
                <button
                  onClick={declineDraw}
                  className="p-2 bg-red-500/20 rounded-lg text-red-500"
                >
                  Decline
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {viewConfig.showRightSidebar && (
          <div className="w-80 flex-shrink-0">
            <GameSidebar
              gameState={gameState}
              onGiveTime={giveTime}
              onResign={resignGame}
              onOfferDraw={offerDraw}
              onAcceptDraw={acceptDraw}
              onDeclineDraw={declineDraw}
              isLocalGame={isLocalGame}
              onFlipBoard={() => setBoardOrientation(prev => prev === "white" ? "black" : "white")}
            />
          </div>
        )}
      </div>
    </div>
  );
}