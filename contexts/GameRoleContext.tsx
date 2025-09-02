"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { SimpleGameState } from "@/lib/game-types";

export type PlayerRole = "white" | "black" | "spectator";
export type Orientation = "white" | "black";

interface GameRoleContextValue {
  // Core role information
  role: PlayerRole;
  orientation: Orientation;

  // Permissions based on role
  canMove: boolean;
  canInteract: boolean;
  isMyTurn: boolean;

  // Helper flags
  isPlayer: boolean;
  isSpectator: boolean;

  // Original game state for reference
  gameState: SimpleGameState | null;
}

const GameRoleContext = createContext<GameRoleContextValue | undefined>(
  undefined,
);

interface GameRoleProviderProps {
  children: ReactNode;
  gameState: SimpleGameState | null;
  urlRole?: PlayerRole; // Optional role from URL for future enhancement
}

export function GameRoleProvider({
  children,
  gameState,
  urlRole,
}: GameRoleProviderProps) {
  const { user } = useAuth();

  const value = useMemo(() => {
    // Default values for when game state is not available
    if (!gameState) {
      return {
        role: "spectator" as PlayerRole,
        orientation: "white" as Orientation,
        canMove: false,
        canInteract: false,
        isMyTurn: false,
        isPlayer: false,
        isSpectator: true,
        gameState: null,
      };
    }

    // Determine player role based on user ID
    let role: PlayerRole = "spectator";

    if (user?.userId) {
      if (gameState.players.white?.id === user.userId) {
        role = "white";
      } else if (gameState.players.black?.id === user.userId) {
        role = "black";
      }
    }

    // Override with URL role if provided and valid (for future URL-based routing)
    if (urlRole && (role === "spectator" || urlRole === role)) {
      role = urlRole;
    }

    // Parse current turn from FEN
    const fenParts = gameState.fen.split(" ");
    const currentTurn = fenParts[1] === "w" ? "white" : "black";

    // Determine permissions
    const isPlayer = role !== "spectator";
    const isSpectator = role === "spectator";
    const isMyTurn = isPlayer && role === currentTurn && !gameState.gameOver;
    const canMove =
      isMyTurn && gameState.legalActions && gameState.legalActions.length > 0;
    const canInteract = isPlayer && !gameState.gameOver;

    // Determine board orientation
    // Players see from their color's perspective, spectators see from white's perspective
    const orientation: Orientation = isSpectator ? "white" : role;

    return {
      role,
      orientation,
      canMove,
      canInteract,
      isMyTurn,
      isPlayer,
      isSpectator,
      gameState,
    };
  }, [gameState, user?.userId, urlRole]);

  return (
    <GameRoleContext.Provider value={value}>
      {children}
    </GameRoleContext.Provider>
  );
}

export function useGameRole() {
  const context = useContext(GameRoleContext);
  if (!context) {
    throw new Error("useGameRole must be used within GameRoleProvider");
  }
  return context;
}

// Helper hook for components that only need to know if they can make moves
export function useCanMove() {
  const { canMove } = useGameRole();
  return canMove;
}

// Helper hook for components that need orientation
export function useBoardOrientation() {
  const { orientation } = useGameRole();
  return orientation;
}
