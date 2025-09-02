'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { getUserRole as computeUserRole } from "@/lib/game-utils";
import type { UserRole } from "@/lib/game-utils";

interface UserRoleContextValue extends UserRole {
  flipBoard: () => void;
}

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { gameState } = useGameState();
  const [spectatorOrientation, setSpectatorOrientation] = useState<"white" | "black">("white");

  const userRole = useMemo(() => {
    return computeUserRole(gameState, user?.userId);
  }, [gameState, user?.userId]);

  const flipBoard = useCallback(() => {
    if (userRole.role === null) { // Only allow spectators to flip
      setSpectatorOrientation(prev => prev === "white" ? "black" : "white");
    }
  }, [userRole.role]);

  const orientation = useMemo(() => {
    if (userRole.role === null) {
      return spectatorOrientation;
    }
    return userRole.orientation;
  }, [userRole.role, userRole.orientation, spectatorOrientation]);

  const contextValue = useMemo<UserRoleContextValue>(() => ({
    ...userRole,
    orientation,
    flipBoard,
  }), [userRole, orientation, flipBoard]);

  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  const context = useContext(UserRoleContext);
  if (!context) {
    return {
      role: null,
      orientation: "white",
      isLocalGame: false,
      flipBoard: () => {},
    };
  }
  return context;
}
