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

    // Check if this is a local/solo game (both players have the same ID)
    const isLocalGame =
      gameState.players.white?.id === gameState.players.black?.id &&
      gameState.players.white?.id !== undefined;

    // Parse current turn from FEN
    const fenParts = gameState.fen.split(" ");
    const currentTurn = fenParts[1] === "w" ? "white" : "black";

    // Debug logging to understand role assignment
    console.log("[GameRoleContext] Role determination:", {
      userId: user?.userId,
      whitePlayerId: gameState.players.white?.id,
      blackPlayerId: gameState.players.black?.id,
      isLocalGame,
      currentTurn,
    });

    // Determine player role
    let role: PlayerRole = "spectator";

    // First check URL role if provided (takes precedence for routing)
    if (urlRole) {
      // Validate that the URL role matches the player's actual role
      if (user?.userId) {
        const isWhitePlayer = gameState.players.white?.id === user.userId;
        const isBlackPlayer = gameState.players.black?.id === user.userId;

        if (isLocalGame && (isWhitePlayer || isBlackPlayer)) {
          // In local games, allow the URL role but switch dynamically for moves
          role = currentTurn;
          console.log(
            "[GameRoleContext] Local game - dynamic role:",
            currentTurn,
            "URL role:",
            urlRole,
          );
        } else if (urlRole === "white" && isWhitePlayer) {
          role = "white";
          console.log("[GameRoleContext] URL role matches - player is white");
        } else if (urlRole === "black" && isBlackPlayer) {
          role = "black";
          console.log("[GameRoleContext] URL role matches - player is black");
        } else if (urlRole === "spectator") {
          role = "spectator";
          console.log("[GameRoleContext] URL role is spectator");
        } else {
          // URL role doesn't match actual role
          console.log(
            "[GameRoleContext] URL role mismatch - urlRole:",
            urlRole,
            "isWhite:",
            isWhitePlayer,
            "isBlack:",
            isBlackPlayer,
          );
          role = "spectator";
        }
      } else {
        // No user, can only spectate
        role = "spectator";
        console.log("[GameRoleContext] No user ID - forced spectator");
      }
    } else {
      // No URL role, determine from user ID
      if (user?.userId) {
        if (isLocalGame && gameState.players.white?.id === user.userId) {
          role = currentTurn;
          console.log(
            "[GameRoleContext] Local game - setting role to:",
            currentTurn,
          );
        } else if (gameState.players.white?.id === user.userId) {
          role = "white";
          console.log("[GameRoleContext] Player is white");
        } else if (gameState.players.black?.id === user.userId) {
          role = "black";
          console.log("[GameRoleContext] Player is black");
        } else {
          console.log("[GameRoleContext] No match - spectator");
        }
      } else {
        console.log("[GameRoleContext] No user ID - spectator");
      }
    }

    // Determine permissions
    const isPlayer = role !== "spectator";
    const isSpectator = role === "spectator";

    // In local games, it's always "my turn" if I'm a player
    const isMyTurn = isLocalGame
      ? isPlayer && !gameState.gameOver
      : isPlayer && role === currentTurn && !gameState.gameOver;

    const canMove = Boolean(
      isMyTurn &&
        gameState.legalActions !== undefined &&
        gameState.legalActions.length > 0,
    );
    const canInteract = isPlayer && !gameState.gameOver;

    // Determine board orientation
    let orientation: Orientation;

    if (isLocalGame) {
      // In local games, always show from white's perspective for consistency
      orientation = "white";
    } else if (isSpectator) {
      // Spectators see from white's perspective
      orientation = "white";
    } else {
      // In online games, players see from their assigned color's perspective
      // Use the actual player assignment, not the dynamic role
      if (gameState.players.white?.id === user?.userId) {
        orientation = "white";
      } else if (gameState.players.black?.id === user?.userId) {
        orientation = "black";
      } else {
        orientation = "white"; // Fallback
      }
    }

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
