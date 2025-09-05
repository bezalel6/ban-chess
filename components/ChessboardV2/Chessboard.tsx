"use client";

import React, { memo, useMemo } from "react";
import Board from "./Board";
import AlertOverlay from "./overlays/AlertOverlay";
import { useBoardPermissions } from "./hooks/useBoardPermissions";
import { useBoardConfig } from "./hooks/useBoardConfig";
import { useMoveHandler, type BanDifficulty } from "./hooks/useMoveHandler";
import { parseFEN, getCurrentBan } from "@/lib/game-types";
import type { SimpleGameState, Move, Ban, Square } from "@/lib/game-types";
import type { BoardPosition, Color, Orientation } from "./types";

interface ChessboardV2Props {
  // Game state
  gameState: SimpleGameState;
  destinations: Map<Square, Square[]>;
  
  // User context
  userRole: Color | null;
  orientation?: Orientation;
  
  // Game status
  actionType: "ban" | "move";
  activePlayer: Color;
  isLocalGame?: boolean;
  
  // Handlers
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  
  // Configuration
  banDifficulty?: BanDifficulty;
  showCoordinates?: boolean;
  refreshKey?: number;
}

const ChessboardV2 = memo(function ChessboardV2({
  gameState,
  destinations,
  userRole,
  orientation = "white",
  actionType,
  activePlayer,
  isLocalGame = false,
  onMove,
  onBan,
  banDifficulty = "medium",
  showCoordinates = false,
  refreshKey = 0,
}: ChessboardV2Props) {
  // Parse FEN to get position data
  const fenData = useMemo(() => {
    if (!gameState?.fen) return null;
    return parseFEN(gameState.fen);
  }, [gameState?.fen]);

  // Get current ban from game state
  const currentBan = useMemo(() => {
    return gameState ? getCurrentBan(gameState.fen) : null;
  }, [gameState]);

  // Calculate board position
  const position: BoardPosition = useMemo(() => ({
    fen: gameState?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    check: gameState?.inCheck ? fenData?.turn : undefined,
    lastMove: undefined, // Could be extracted from history if needed
  }), [gameState, fenData]);

  // Calculate permissions
  const permissions = useBoardPermissions({
    userRole,
    activePlayer,
    actionType,
    gameOver: gameState?.gameOver || false,
    isLocalGame,
  });

  // Configure board appearance
  const config = useBoardConfig({
    orientation,
    coordinates: showCoordinates,
    animationDuration: 200,
    showLastMove: true,
    showCheck: true,
  });

  // Setup move/ban handlers with banned move detection
  const {
    handleMove,
    handleBan,
    showBannedAlert,
    dismissBannedAlert,
  } = useMoveHandler({
    onMove,
    onBan,
    currentBan: currentBan || undefined,
    banDifficulty,
  });

  // Loading state
  if (!gameState) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate style for ban mode
  const boardStyle = permissions.canBan && !permissions.canMove ? {
    '--cg-move-dest-color': 'rgba(139, 0, 0, 0.5)',
    '--cg-move-dest-center': '#8b0000',
    '--cg-move-dest-hover': 'rgba(220, 20, 60, 0.4)',
    '--cg-selected-color': 'rgba(220, 20, 60, 0.5)',
    '--cg-oc-move-dest': 'rgba(139, 0, 0, 0.3)',
  } as React.CSSProperties : {};

  return (
    <div className="w-full h-full" style={boardStyle}>
      <Board
        position={position}
        destinations={destinations}
        permissions={permissions}
        config={config}
        handlers={{
          onMove: handleMove,
          onBan: handleBan,
        }}
        actionType={actionType}
        currentBan={currentBan || undefined}
        refreshKey={refreshKey}
      />
      
      {/* Banned move alert */}
      <AlertOverlay
        visible={showBannedAlert}
        message="BANNED MOVE!"
        severity={banDifficulty === "hard" ? "error" : banDifficulty === "medium" ? "warning" : "info"}
        duration={2000}
        onDismiss={dismissBannedAlert}
      />
    </div>
  );
});

export default ChessboardV2;