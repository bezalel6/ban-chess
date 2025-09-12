'use client';

import { useState, useEffect, useCallback } from 'react';

export type BanDifficulty = 'easy' | 'medium' | 'hard';

const STORAGE_KEY = 'ban-difficulty';
const DEFAULT_DIFFICULTY: BanDifficulty = 'medium';

/**
 * Hook for managing AI ban difficulty setting
 * Persists to localStorage for user preference
 */
export function useBanDifficulty() {
  const [banDifficulty, setBanDifficultyState] = useState<BanDifficulty>(DEFAULT_DIFFICULTY);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'easy' || stored === 'medium' || stored === 'hard') {
        setBanDifficultyState(stored);
      }
    }
  }, []);

  // Wrapped setter that also persists to localStorage
  const setBanDifficulty = useCallback((difficulty: BanDifficulty) => {
    setBanDifficultyState(difficulty);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, difficulty);
    }
  }, []);

  return { banDifficulty, setBanDifficulty };
}