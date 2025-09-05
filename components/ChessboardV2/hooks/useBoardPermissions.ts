import { useMemo } from "react";
import type { BoardPermissions, Color } from "../types";

interface PermissionParams {
  userRole: Color | null;
  activePlayer: Color;
  actionType: "ban" | "move";
  gameOver: boolean;
  isLocalGame?: boolean;
}

export function useBoardPermissions({
  userRole,
  activePlayer,
  actionType,
  gameOver,
  isLocalGame = false,
}: PermissionParams): BoardPermissions {
  return useMemo(() => {
    // No interaction if game is over
    if (gameOver) {
      return {
        canInteract: false,
        canMove: false,
        canBan: false,
        movableColor: undefined,
      };
    }

    // Spectators can't interact
    if (userRole === null && !isLocalGame) {
      return {
        canInteract: false,
        canMove: false,
        canBan: false,
        movableColor: undefined,
      };
    }

    // Check if it's the user's turn
    const isMyTurn = isLocalGame || userRole === activePlayer;
    
    if (!isMyTurn) {
      return {
        canInteract: false,
        canMove: false,
        canBan: false,
        movableColor: undefined,
      };
    }

    // User can interact - determine what they can do
    const canMove = actionType === "move";
    const canBan = actionType === "ban";

    return {
      canInteract: true,
      canMove,
      canBan,
      // Allow selecting both colors for ban/move actions
      // The server-provided destinations will restrict actual moves
      movableColor: "both",
    };
  }, [userRole, activePlayer, actionType, gameOver, isLocalGame]);
}