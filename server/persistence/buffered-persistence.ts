import { db, games, moves, gameEvents, users } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import {
  toUUID,
  toOptionalUUID,
  getProviderFromId,
} from '../utils/uuid-converter';

interface BufferedMove {
  gameId: string;
  moveNumber: number;
  color: 'white' | 'black';
  notation: string;
  uci?: string;
  fenAfter: string;
  clockWhite?: number;
  clockBlack?: number;
  isBan: boolean;
  createdAt: Date;
}

interface BufferedGameEvent {
  gameId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Lichess-style buffered persistence service
 * Buffers moves and events in memory, then batch inserts to PostgreSQL
 */
export class BufferedPersistenceService {
  private moveBuffer: Map<string, BufferedMove[]> = new Map();
  private eventBuffer: Map<string, BufferedGameEvent[]> = new Map();
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BUFFER_SIZE = 100; // Flush after 100 moves per game
  private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds
  private readonly BATCH_INSERT_SIZE = 1000; // Insert up to 1000 rows at once

  constructor() {
    // Start periodic flush timer
    this.startPeriodicFlush();
  }

  /**
   * Start periodic buffer flushing
   */
  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flushAllBuffers().catch(err => {
        console.error(
          '[BufferedPersistence] Error during periodic flush:',
          err
        );
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Add a move to the buffer
   */
  async bufferMove(move: BufferedMove): Promise<void> {
    const gameId = move.gameId;

    if (!this.moveBuffer.has(gameId)) {
      this.moveBuffer.set(gameId, []);
    }

    const buffer = this.moveBuffer.get(gameId)!;
    buffer.push(move);

    // Check if we should flush this game's buffer
    if (buffer.length >= this.BUFFER_SIZE) {
      await this.flushGameMoves(gameId);
    }
  }

  /**
   * Add an event to the buffer
   */
  async bufferEvent(event: BufferedGameEvent): Promise<void> {
    const gameId = event.gameId;

    if (!this.eventBuffer.has(gameId)) {
      this.eventBuffer.set(gameId, []);
    }

    this.eventBuffer.get(gameId)!.push(event);

    // Events are less frequent, flush after 50
    if (this.eventBuffer.get(gameId)!.length >= 50) {
      await this.flushGameEvents(gameId);
    }
  }

  /**
   * Flush moves for a specific game
   */
  private async flushGameMoves(gameId: string): Promise<void> {
    const buffer = this.moveBuffer.get(gameId);
    if (!buffer || buffer.length === 0) return;

    try {
      // Batch insert moves
      await db.insert(moves).values(
        buffer.map(move => ({
          gameId: move.gameId,
          moveNumber: move.moveNumber,
          color: move.color,
          notation: move.notation,
          uci: move.uci,
          fenAfter: move.fenAfter,
          clockWhite: move.clockWhite,
          clockBlack: move.clockBlack,
          isBan: move.isBan,
        }))
      );

      console.log(
        `[BufferedPersistence] Flushed ${buffer.length} moves for game ${gameId}`
      );

      // Clear the buffer for this game
      this.moveBuffer.set(gameId, []);
    } catch (error) {
      console.error(
        `[BufferedPersistence] Error flushing moves for game ${gameId}:`,
        error
      );
      // Keep the buffer on error to retry later
    }
  }

  /**
   * Flush events for a specific game
   */
  private async flushGameEvents(gameId: string): Promise<void> {
    const buffer = this.eventBuffer.get(gameId);
    if (!buffer || buffer.length === 0) return;

    try {
      await db.insert(gameEvents).values(
        buffer.map(event => ({
          gameId: event.gameId,
          eventType: event.eventType,
          eventData: event.eventData,
          timestamp: event.timestamp,
        }))
      );

      console.log(
        `[BufferedPersistence] Flushed ${buffer.length} events for game ${gameId}`
      );

      // Clear the buffer
      this.eventBuffer.set(gameId, []);
    } catch (error) {
      console.error(
        `[BufferedPersistence] Error flushing events for game ${gameId}:`,
        error
      );
    }
  }

  /**
   * Flush all buffers - called periodically or on game completion
   */
  async flushAllBuffers(): Promise<void> {
    const movePromises: Promise<void>[] = [];
    const eventPromises: Promise<void>[] = [];

    // Flush all move buffers
    for (const gameId of this.moveBuffer.keys()) {
      if (this.moveBuffer.get(gameId)?.length ?? 0 > 0) {
        movePromises.push(this.flushGameMoves(gameId));
      }
    }

    // Flush all event buffers
    for (const gameId of this.eventBuffer.keys()) {
      if (this.eventBuffer.get(gameId)?.length ?? 0 > 0) {
        eventPromises.push(this.flushGameEvents(gameId));
      }
    }

    // Wait for all flushes to complete
    await Promise.all([...movePromises, ...eventPromises]);
  }

  /**
   * Force flush for a specific game (e.g., when game ends)
   */
  async flushGame(gameId: string): Promise<void> {
    await Promise.all([
      this.flushGameMoves(gameId),
      this.flushGameEvents(gameId),
    ]);

    // Remove buffers for completed game
    this.moveBuffer.delete(gameId);
    this.eventBuffer.delete(gameId);
  }

  /**
   * Create or update a user
   */
  async upsertUser(
    userId: string,
    username: string,
    email?: string
  ): Promise<void> {
    // Convert to valid UUID using centralized converter
    const validUserId = toUUID(userId);
    const provider = getProviderFromId(userId);

    await db
      .insert(users)
      .values({
        id: validUserId,
        username,
        email,
        provider,
        providerId: provider === 'guest' ? userId : undefined,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          lastSeenAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  /**
   * Create a new game record
   */
  async createGame(gameData: {
    id: string;
    whitePlayerId?: string;
    blackPlayerId?: string;
    isSoloGame: boolean;
    timeControl?: { initial: number; increment: number };
  }): Promise<void> {
    // Convert player IDs to UUIDs using centralized converter
    const whiteId = toOptionalUUID(gameData.whitePlayerId);
    const blackId = toOptionalUUID(gameData.blackPlayerId);

    await db.insert(games).values({
      id: gameData.id,
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      isSoloGame: gameData.isSoloGame,
      timeControl: gameData.timeControl,
    });
  }

  /**
   * Update game when it completes
   */
  async completeGame(gameData: {
    id: string;
    pgn: string;
    fenFinal: string;
    result: string;
    totalMoves: number;
    totalBans: number;
    banMoves: string[];
  }): Promise<void> {
    // First flush any remaining moves/events
    await this.flushGame(gameData.id);

    // Update the game record
    await db
      .update(games)
      .set({
        pgn: gameData.pgn,
        fenFinal: gameData.fenFinal,
        result: gameData.result,
        totalMoves: gameData.totalMoves,
        totalBans: gameData.totalBans,
        banMoves: gameData.banMoves,
        completedAt: new Date(),
      })
      .where(eq(games.id, gameData.id));

    // Update player statistics if it's not a solo game
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameData.id),
    });

    if (game && !game.isSoloGame && game.whitePlayerId && game.blackPlayerId) {
      // Update games played count
      await Promise.all([
        db
          .update(users)
          .set({
            gamesPlayed: sql`${users.gamesPlayed} + 1`,
            gamesWon:
              gameData.result === '1-0'
                ? sql`${users.gamesWon} + 1`
                : users.gamesWon,
            gamesLost:
              gameData.result === '0-1'
                ? sql`${users.gamesLost} + 1`
                : users.gamesLost,
            gamesDrawn:
              gameData.result === '1/2-1/2'
                ? sql`${users.gamesDrawn} + 1`
                : users.gamesDrawn,
          })
          .where(eq(users.id, game.whitePlayerId)),

        db
          .update(users)
          .set({
            gamesPlayed: sql`${users.gamesPlayed} + 1`,
            gamesWon:
              gameData.result === '0-1'
                ? sql`${users.gamesWon} + 1`
                : users.gamesWon,
            gamesLost:
              gameData.result === '1-0'
                ? sql`${users.gamesLost} + 1`
                : users.gamesLost,
            gamesDrawn:
              gameData.result === '1/2-1/2'
                ? sql`${users.gamesDrawn} + 1`
                : users.gamesDrawn,
          })
          .where(eq(users.id, game.blackPlayerId)),
      ]);
    }

    console.log(
      `[BufferedPersistence] Game ${gameData.id} completed and archived`
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    return await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  /**
   * Get recent games for a user
   */
  async getUserGames(userId: string, limit: number = 10) {
    return await db.query.games.findMany({
      where: and(
        eq(games.completedAt, sql`NOT NULL`),
        sql`${games.whitePlayerId} = ${userId} OR ${games.blackPlayerId} = ${userId}`
      ),
      orderBy: (games, { desc }) => [desc(games.completedAt)],
      limit,
      with: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    // Stop periodic flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush all remaining buffers
    await this.flushAllBuffers();

    console.log('[BufferedPersistence] Service shutdown complete');
  }
}

// Export singleton instance
export const bufferedPersistence = new BufferedPersistenceService();
