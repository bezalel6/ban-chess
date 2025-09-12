'use client';

import { useState, useEffect } from 'react';
import { gameStore } from '@/lib/game/GameStore';
import type { UserRole } from '@/lib/game/GameStore';

/**
 * Hook to subscribe to user role for a specific game
 * Replaces the old UserRoleContext
 */
export function useGameRole(gameId: string | null) {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (!gameId) {
      return {
        role: 'spectator',
        canMove: false,
        canBan: false,
        orientation: 'white'
      };
    }
    return gameStore.getUserRole(gameId);
  });

  useEffect(() => {
    if (!gameId) {
      setUserRole({
        role: 'spectator',
        canMove: false,
        canBan: false,
        orientation: 'white'
      });
      return;
    }

    // Subscribe to role changes
    const unsubscribe = gameStore.subscribeToRole(gameId, setUserRole);
    return unsubscribe;
  }, [gameId]);

  return userRole;
}

/**
 * Simplified hook for components that only need basic role info
 * Note: Components should pass gameId directly to useGameRole instead
 */
export function useUserRole() {
  // For backwards compatibility, return spectator role
  // Components should migrate to useGameRole(gameId) directly
  return {
    role: 'spectator' as const,
    orientation: 'white' as const,
    canMove: false,
    canBan: false
  };
}