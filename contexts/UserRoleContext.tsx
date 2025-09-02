"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGameState } from "@/hooks/useGameState";
import { getUserRole as computeUserRole } from "@/lib/game-utils";
import type { UserRole } from "@/lib/game-utils";

interface UserRoleContextValue extends UserRole {
  // Additional context methods could go here if needed
}

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { gameState } = useGameState();

  // Memoize the user role computation
  // Only recomputes when gameState or userId changes
  const userRole = useMemo(() => {
    return computeUserRole(gameState, user?.userId);
  }, [gameState, user?.userId]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<UserRoleContextValue>(() => ({
    ...userRole,
  }), [userRole]);

  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  const context = useContext(UserRoleContext);
  if (!context) {
    // Return default values when outside provider
    // This allows components to render before game state is loaded
    return {
      role: null,
      orientation: "white",
      isLocalGame: false,
    };
  }
  return context;
}