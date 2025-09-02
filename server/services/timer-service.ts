/**
 * Timer Service Layer
 *
 * Redis-based time management following Lichess patterns.
 * All timer state is stored in Redis for horizontal scaling.
 */

import { redis, redisPub, KEYS } from "../redis";
import type { TimeControl, PlayerClock } from "@/lib/game-types";

interface TimerState {
  white: PlayerClock;
  black: PlayerClock;
  activePlayer: "white" | "black" | null;
  isPaused: boolean;
  timeControl: TimeControl;
}

export class TimerService {
  private static readonly TICK_INTERVAL = 100; // Update every 100ms for precision
  private static activeTimers = new Map<
    string,
    ReturnType<typeof setInterval>
  >();

  /**
   * Initialize timer for a new game
   */
  static async initializeTimer(
    gameId: string,
    timeControl: TimeControl,
    startingPlayer: "white" | "black" = "white",
  ): Promise<void> {
    const initialState: TimerState = {
      white: {
        remaining: timeControl.initial * 1000, // Convert to milliseconds
        lastUpdate: Date.now(),
      },
      black: {
        remaining: timeControl.initial * 1000,
        lastUpdate: Date.now(),
      },
      activePlayer: startingPlayer,
      isPaused: false,
      timeControl,
    };

    await redis.set(
      KEYS.TIMER(gameId),
      JSON.stringify(initialState),
      "EX",
      86400, // Expire after 24 hours
    );

    // Start the timer
    this.startTimer(gameId);
  }

  /**
   * Switch active player and apply increment
   */
  static async switchPlayer(
    gameId: string,
    toPlayer: "white" | "black",
  ): Promise<void> {
    const timerState = await this.getTimerState(gameId);
    if (!timerState) return;

    // Stop current player's clock and add increment
    if (timerState.activePlayer) {
      const now = Date.now();
      const elapsed = now - timerState[timerState.activePlayer].lastUpdate;

      timerState[timerState.activePlayer].remaining = Math.max(
        0,
        timerState[timerState.activePlayer].remaining - elapsed,
      );

      // Add increment to the player who just moved
      if (timerState.timeControl.increment > 0) {
        timerState[timerState.activePlayer].remaining +=
          timerState.timeControl.increment * 1000;
      }
    }

    // Switch to new player
    timerState.activePlayer = toPlayer;
    timerState[toPlayer].lastUpdate = Date.now();

    await this.saveTimerState(gameId, timerState);

    // Restart timer for new player
    this.startTimer(gameId);
  }

  /**
   * Get current clock state
   */
  static async getClocks(gameId: string): Promise<{
    white: PlayerClock;
    black: PlayerClock;
  } | null> {
    const timerState = await this.getTimerState(gameId);
    if (!timerState) return null;

    // Calculate current remaining time for active player
    if (timerState.activePlayer && !timerState.isPaused) {
      const now = Date.now();
      const elapsed = now - timerState[timerState.activePlayer].lastUpdate;

      timerState[timerState.activePlayer].remaining = Math.max(
        0,
        timerState[timerState.activePlayer].remaining - elapsed,
      );
      timerState[timerState.activePlayer].lastUpdate = now;
    }

    return {
      white: timerState.white,
      black: timerState.black,
    };
  }

  /**
   * Give time to a player
   */
  static async giveTime(
    gameId: string,
    toPlayer: "white" | "black",
    seconds: number,
  ): Promise<void> {
    const timerState = await this.getTimerState(gameId);
    if (!timerState) return;

    timerState[toPlayer].remaining += seconds * 1000;
    await this.saveTimerState(gameId, timerState);

    // Broadcast clock update
    await this.broadcastClockUpdate(gameId);
  }

  /**
   * Pause timer (for game end)
   */
  static async pauseTimer(gameId: string): Promise<void> {
    // Stop the interval
    const interval = this.activeTimers.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.activeTimers.delete(gameId);
    }

    // Update state in Redis
    const timerState = await this.getTimerState(gameId);
    if (timerState) {
      timerState.isPaused = true;
      await this.saveTimerState(gameId, timerState);
    }
  }

  /**
   * Resume timer
   */
  static async resumeTimer(gameId: string): Promise<void> {
    const timerState = await this.getTimerState(gameId);
    if (!timerState || !timerState.isPaused) return;

    timerState.isPaused = false;
    if (timerState.activePlayer) {
      timerState[timerState.activePlayer].lastUpdate = Date.now();
    }

    await this.saveTimerState(gameId, timerState);
    this.startTimer(gameId);
  }

  /**
   * Destroy timer (game ended)
   */
  static async destroyTimer(gameId: string): Promise<void> {
    // Stop interval
    const interval = this.activeTimers.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.activeTimers.delete(gameId);
    }

    // Remove from Redis
    await redis.del(KEYS.TIMER(gameId));
  }

  /**
   * Start timer interval for a game
   */
  private static startTimer(gameId: string): void {
    // Clear existing interval if any
    const existingInterval = this.activeTimers.get(gameId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new interval
    const interval = setInterval(async () => {
      await this.tick(gameId);
    }, this.TICK_INTERVAL);

    this.activeTimers.set(gameId, interval);
  }

  /**
   * Timer tick - updates time and checks for timeout
   */
  private static async tick(gameId: string): Promise<void> {
    const timerState = await this.getTimerState(gameId);

    if (!timerState || timerState.isPaused || !timerState.activePlayer) {
      return;
    }

    const now = Date.now();
    const elapsed = now - timerState[timerState.activePlayer].lastUpdate;
    const newRemaining =
      timerState[timerState.activePlayer].remaining - elapsed;

    if (newRemaining <= 0) {
      // Time's up!
      timerState[timerState.activePlayer].remaining = 0;
      timerState.isPaused = true;
      await this.saveTimerState(gameId, timerState);

      // Stop the timer
      const interval = this.activeTimers.get(gameId);
      if (interval) {
        clearInterval(interval);
        this.activeTimers.delete(gameId);
      }

      // Broadcast timeout event
      const winner = timerState.activePlayer === "white" ? "black" : "white";
      await redisPub.publish(
        KEYS.CHANNELS.GAME_STATE(gameId),
        JSON.stringify({
          type: "timeout",
          gameId,
          winner,
        }),
      );
    } else {
      // Update remaining time
      timerState[timerState.activePlayer].remaining = newRemaining;
      timerState[timerState.activePlayer].lastUpdate = now;
      await this.saveTimerState(gameId, timerState);

      // Broadcast clock update every second
      if (elapsed >= 1000) {
        await this.broadcastClockUpdate(gameId);
      }
    }
  }

  /**
   * Get timer state from Redis
   */
  private static async getTimerState(
    gameId: string,
  ): Promise<TimerState | null> {
    const data = await redis.get(KEYS.TIMER(gameId));
    if (!data) return null;

    return JSON.parse(data) as TimerState;
  }

  /**
   * Save timer state to Redis
   */
  private static async saveTimerState(
    gameId: string,
    state: TimerState,
  ): Promise<void> {
    await redis.set(
      KEYS.TIMER(gameId),
      JSON.stringify(state),
      "EX",
      86400, // Expire after 24 hours
    );
  }

  /**
   * Broadcast clock update to all clients
   */
  private static async broadcastClockUpdate(gameId: string): Promise<void> {
    const clocks = await this.getClocks(gameId);
    if (!clocks) return;

    await redisPub.publish(
      KEYS.CHANNELS.GAME_STATE(gameId),
      JSON.stringify({
        type: "clock-update",
        gameId,
        clocks,
      }),
    );
  }

  /**
   * Restore timers on server startup
   */
  static async restoreActiveTimers(): Promise<void> {
    // Get all active timer keys
    const keys = await redis.keys(KEYS.TIMER("*"));

    for (const key of keys) {
      const gameId = key.replace("timer:", "");
      const timerState = await this.getTimerState(gameId);

      if (timerState && !timerState.isPaused && timerState.activePlayer) {
        // Restart timer for active games
        this.startTimer(gameId);
        console.log(`[TimerService] Restored timer for game ${gameId}`);
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  static shutdown(): void {
    // Clear all intervals
    for (const [gameId, interval] of this.activeTimers) {
      clearInterval(interval);
      console.log(`[TimerService] Stopped timer for game ${gameId}`);
    }
    this.activeTimers.clear();
  }
}
