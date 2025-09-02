import type { SimpleGameState } from "./game-types";

export type PlayerRole = "white" | "black" | null;
export type Orientation = "white" | "black";

export interface UserRole {
  role: PlayerRole;  // What color you're playing (or null for spectator)
  orientation: Orientation;  // How the board should be oriented
  isLocalGame: boolean;  // Whether this is a solo/local game
}

/**
 * Simplified function that ONLY determines what role/color this user is playing.
 * All game logic (permissions, turn, etc.) comes from the BanChess instance directly.
 */
export function getUserRole(
  gameState: SimpleGameState | null,
  userId: string | undefined
): UserRole {
  // Default values
  if (!gameState) {
    return {
      role: null,
      orientation: "white",
      isLocalGame: false,
    };
  }

  // Check if this is a local/solo game
  const isLocalGame =
    gameState.players.white?.id === gameState.players.black?.id &&
    gameState.players.white?.id !== undefined;

  // Determine what color this user is playing (their seat at the table)
  let playerColor: PlayerRole = null;
  if (userId && gameState.players.white?.id === userId) {
    playerColor = "white";
  } else if (userId && gameState.players.black?.id === userId) {
    playerColor = "black";
  }
  
  // In local games, the player controls whoever is active - get from server
  const role: PlayerRole = isLocalGame ? (gameState.activePlayer || "white") : playerColor;
  
  // Board orientation - you see from your seat's perspective (or white in local games)
  const orientation: Orientation = isLocalGame ? "white" : (playerColor || "white");

  console.log("[game-utils] User role:", {
    userId,
    playerColor,
    role,
    isLocalGame,
    orientation,
  });

  return {
    role,
    orientation,
    isLocalGame,
  };
}