'use client';

import { useState, useEffect, useRef } from 'react';
import type { PlayerClock } from '@/lib/game-types';

interface UseGameTimerProps {
  clock: PlayerClock | undefined;
  isActive: boolean;
  onTimeout?: () => void;
}

export function useGameTimer({ clock, isActive, onTimeout }: UseGameTimerProps) {
  const [displayTime, setDisplayTime] = useState<number>(clock?.remaining || 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Update display time when clock changes (server update)
    if (clock) {
      setDisplayTime(clock.remaining);
      lastUpdateRef.current = clock.lastUpdate;
    }
  }, [clock]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only run countdown if active and have time
    if (isActive && displayTime > 0) {
      intervalRef.current = setInterval(() => {
        setDisplayTime(prevTime => {
          const now = Date.now();
          const elapsed = now - lastUpdateRef.current;
          lastUpdateRef.current = now;
          
          const newTime = Math.max(0, prevTime - elapsed);
          
          // Check for timeout
          if (newTime === 0 && prevTime > 0 && onTimeout) {
            onTimeout();
          }
          
          return newTime;
        });
      }, 100); // Update every 100ms for smooth display
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, displayTime, onTimeout]);

  // Format time for display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    displayTime,
    formattedTime: formatTime(displayTime),
    isLowTime: displayTime < 10000, // Less than 10 seconds
    isCritical: displayTime < 3000, // Less than 3 seconds
  };
}