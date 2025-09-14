'use client';

import { useState, useCallback } from 'react';

export type BanPenaltySeverity = 'mild' | 'moderate' | 'severe';

const STORAGE_KEY = 'ban-penalty-severity';
const DEFAULT_SEVERITY: BanPenaltySeverity = 'moderate';

/**
 * Hook for managing how severely the board reacts when a banned move is attempted
 * Controls visual feedback intensity and sound effects
 * Persists to localStorage for user preference
 */
export function useBanPenalty() {
  // Initialize state with value from localStorage if available
  const [banPenalty, setBanPenaltyState] = useState<BanPenaltySeverity>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Check for old keys for backwards compatibility
      const oldStored = localStorage.getItem('ban-difficulty');
      
      if (stored === 'mild' || stored === 'moderate' || stored === 'severe') {
        return stored;
      } else if (oldStored) {
        // Migrate old values
        const migrated = oldStored === 'easy' ? 'mild' : 
                        oldStored === 'medium' ? 'moderate' : 
                        oldStored === 'hard' ? 'severe' : 'moderate';
        localStorage.setItem(STORAGE_KEY, migrated);
        localStorage.removeItem('ban-difficulty');
        return migrated;
      }
    }
    return DEFAULT_SEVERITY;
  });

  // Wrapped setter that also persists to localStorage
  const setBanPenalty = useCallback((severity: BanPenaltySeverity) => {
    setBanPenaltyState(severity);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, severity);
    }
  }, []);

  return { banPenalty, setBanPenalty };
}