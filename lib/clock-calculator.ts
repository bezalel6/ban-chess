import type { PlayerClock } from "./game-types";

/**
 * Parsed time control configuration
 */
interface TimeControlConfig {
  initial: number; // Initial time in seconds
  increment: number; // Increment in seconds
}

/**
 * Parse time control string (e.g., "600+5" -> {initial: 600, increment: 5})
 */
export function parseTimeControl(timeControl: string): TimeControlConfig {
  if (timeControl === "unlimited") {
    return { initial: Infinity, increment: 0 };
  }
  
  const match = timeControl.match(/^(\d+)\+(\d+)$/);
  if (!match) {
    throw new Error(`Invalid time control format: ${timeControl}`);
  }
  
  return {
    initial: parseInt(match[1], 10),
    increment: parseInt(match[2], 10),
  };
}

/**
 * Determine which player makes an action based on its index in the BCN sequence
 * This follows the exact same logic as the existing codebase in game-types.ts
 * Ban-chess turn order:
 * - Action 0: Black bans (ply 1) 
 * - Action 1: White moves (ply 2)
 * - Action 2: White bans (ply 3)
 * - Action 3: Black moves (ply 4)
 * - Action 4: Black bans (ply 5)
 * - Action 5: White moves (ply 6)
 * - etc...
 */
export function getPlayerForAction(actionIndex: number, bcnAction: string): "white" | "black" {
  const ply = actionIndex + 1; // Convert to 1-based ply number
  
  if (bcnAction.startsWith("b:")) {
    // Ban phase - use existing logic from game-types.ts getWhoBans()
    // Ply 1,5,9... = Black bans
    // Ply 3,7,11... = White bans
    return ((ply - 1) / 2) % 2 === 0 ? "black" : "white";
  } else {
    // Move phase - determine from ply number
    // Even plies are move phases
    // Ply 2,6,10... = White moves  
    // Ply 4,8,12... = Black moves
    const moveNumber = Math.floor((ply - 1) / 2) + 1;
    return moveNumber % 2 === 1 ? "white" : "black";
  }
}

/**
 * Check if an action is a move (as opposed to a ban)
 */
export function isMove(bcnAction: string): boolean {
  return bcnAction.startsWith("m:");
}

/**
 * Calculate the clock state at a specific move index during game replay
 * @param bcn Array of BCN action strings
 * @param moveTimes Array of time taken per action (milliseconds)
 * @param timeControl Time control string (e.g., "600+5")
 * @param moveIndex Index of the move to calculate clocks for (-1 for starting position)
 * @returns Clock state for both players at the specified position
 */
export function calculateClocksAtMove(
  bcn: string[],
  moveTimes: number[],
  timeControl: string,
  moveIndex: number
): { white: PlayerClock; black: PlayerClock } {
  const config = parseTimeControl(timeControl);
  const now = Date.now();
  
  // Initialize with starting time (convert seconds to milliseconds)
  const clocks = {
    white: {
      remaining: config.initial === Infinity ? Infinity : config.initial * 1000,
      lastUpdate: now,
    },
    black: {
      remaining: config.initial === Infinity ? Infinity : config.initial * 1000,
      lastUpdate: now,
    },
  };
  
  // If moveIndex is -1, return starting position
  if (moveIndex < 0) {
    return clocks;
  }
  
  // Apply time deductions up to the specified move index
  const actionsToProcess = Math.min(moveIndex + 1, bcn.length, moveTimes.length);
  
  for (let i = 0; i < actionsToProcess; i++) {
    const action = bcn[i];
    const timeTaken = moveTimes[i];
    const player = getPlayerForAction(i, action);
    
    // Subtract time taken from the acting player
    if (clocks[player].remaining !== Infinity) {
      clocks[player].remaining -= timeTaken;
      // Ensure time doesn't go negative
      clocks[player].remaining = Math.max(0, clocks[player].remaining);
    }
    
    // Add increment after moves (not bans)
    if (isMove(action) && config.increment > 0 && clocks[player].remaining !== Infinity) {
      clocks[player].remaining += config.increment * 1000;
    }
  }
  
  return clocks;
}

/**
 * Format time in milliseconds to MM:SS format
 * @param milliseconds Time in milliseconds
 * @returns Formatted time string
 */
export function formatClockTime(milliseconds: number): string {
  if (milliseconds === Infinity || milliseconds < 0) {
    return "∞";
  }
  
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}