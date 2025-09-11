'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole as computeUserRole } from "@/lib/game-utils";
import type { UserRole } from "@/lib/game-utils";
import type { SimpleGameState } from "@/lib/game-types";

export type BanDifficulty = "easy" | "medium" | "hard";

interface UserRoleContextValue extends UserRole {
  flipBoard: () => void;
  autoFlipEnabled: boolean;
  setAutoFlipEnabled: (enabled: boolean) => void;
  manualOrientation: "white" | "black" | null;
  setManualOrientation: (orientation: "white" | "black" | null) => void;
  banDifficulty: BanDifficulty;
  setBanDifficulty: (difficulty: BanDifficulty) => void;
}

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

interface UserRoleProviderProps {
  children: ReactNode;
  gameState?: SimpleGameState | null;
}

export function UserRoleProvider({ children, gameState }: UserRoleProviderProps) {
  const { user } = useAuth();
  const [spectatorOrientation, setSpectatorOrientation] = useState<"white" | "black">("white");
  const [autoFlipEnabled, setAutoFlipEnabled] = useState<boolean>(() => {
    // Load auto-flip preference from localStorage, default to true for local games
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoFlipLocalGames');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [manualOrientation, setManualOrientation] = useState<"white" | "black" | null>(null);
  const [banDifficulty, setBanDifficulty] = useState<BanDifficulty>(() => {
    // Load ban difficulty from localStorage, default to medium
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('banDifficulty');
      if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
        return saved;
      }
    }
    return 'medium';
  });

  const userRole = useMemo(() => {
    return computeUserRole(gameState || null, user?.userId);
  }, [gameState, user?.userId]);

  const flipBoard = useCallback(() => {
    if (userRole.role === null) { // Spectators can flip
      setSpectatorOrientation(prev => prev === "white" ? "black" : "white");
    } else if (userRole.isLocalGame) { // Local game players can flip manually
      // Toggle manual orientation
      setManualOrientation(prev => {
        if (prev === null) {
          // If no manual orientation set, flip from current auto orientation
          return userRole.orientation === "white" ? "black" : "white";
        }
        return prev === "white" ? "black" : "white";
      });
    }
  }, [userRole.role, userRole.isLocalGame, userRole.orientation]);

  const orientation = useMemo(() => {
    if (userRole.role === null) {
      return spectatorOrientation;
    }
    // In local games, use manual orientation if set, otherwise use auto-flip based on active player
    if (userRole.isLocalGame && manualOrientation !== null) {
      return manualOrientation;
    }
    return userRole.orientation;
  }, [userRole.role, userRole.orientation, userRole.isLocalGame, spectatorOrientation, manualOrientation]);

  // Reset manual orientation when auto-flip is re-enabled
  useEffect(() => {
    if (autoFlipEnabled) {
      setManualOrientation(null);
    }
  }, [autoFlipEnabled]);

  // Save auto-flip preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoFlipLocalGames', autoFlipEnabled.toString());
    }
  }, [autoFlipEnabled]);

  // Save ban difficulty preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('banDifficulty', banDifficulty);
    }
  }, [banDifficulty]);

  const contextValue = useMemo<UserRoleContextValue>(() => ({
    ...userRole,
    orientation,
    flipBoard,
    autoFlipEnabled,
    setAutoFlipEnabled,
    manualOrientation,
    setManualOrientation,
    banDifficulty,
    setBanDifficulty,
  }), [userRole, orientation, flipBoard, autoFlipEnabled, setAutoFlipEnabled, manualOrientation, setManualOrientation, banDifficulty, setBanDifficulty]);

  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
