import type { SimpleGameState } from "./game-types";
import { BanChess } from "ban-chess.ts";

export type PlayerRole = "white" | "black" | null;
export type Orientation = "white" | "black";

export interface GamePermissions {
  role: PlayerRole;
  orientation: Orientation;
  canMove: boolean;
  canBan: boolean;
  canInteract: boolean;
  isMyTurn: boolean;
  isPlayer: boolean;
  currentAction: "move" | "ban";
}

export function getGamePermissions(
  gameState: SimpleGameState | null,
  game: BanChess | null,
  userId: string | undefined
): GamePermissions {
  // Default values for when game is not available
  if (!game || !gameState) {
    return {
      role: null,
      orientation: "white",
      canMove: false,
      canBan: false,
      canInteract: false,
      isMyTurn: false,
      isPlayer: false,
      currentAction: "move",
    };
  }

  // Check if this is a local/solo game
  const isLocalGame =
    gameState.players.white?.id === gameState.players.black?.id &&
    gameState.players.white?.id !== undefined;

  // Get state from BanChess instance
  const currentAction = game.nextActionType();
  const currentTurn = game.turn;

  // Determine player's role
  let role: PlayerRole = null;
  
  if (userId && gameState.players.white?.id === userId) {
    role = "white";
  } else if (userId && gameState.players.black?.id === userId) {
    role = "black";
  }

  // In local games, role switches based on current turn
  if (isLocalGame && role) {
    role = currentTurn;
  }

  // Determine permissions
  const isPlayer = role !== null;
  const isMyTurn = isLocalGame
    ? isPlayer && !gameState.gameOver
    : isPlayer && role === currentTurn && !gameState.gameOver;

  // Permissions based on turn and action type
  const canMove = isMyTurn && currentAction === "move";
  const canBan = isMyTurn && currentAction === "ban";
  const canInteract = isPlayer && !gameState.gameOver;

  // Determine board orientation
  let orientation: Orientation = "white";
  if (!isLocalGame && role) {
    // Players see from their assigned color's perspective
    orientation = gameState.players.white?.id === userId ? "white" : "black";
  }

  return {
    role,
    orientation,
    canMove,
    canBan,
    canInteract,
    isMyTurn,
    isPlayer,
    currentAction,
  };
}