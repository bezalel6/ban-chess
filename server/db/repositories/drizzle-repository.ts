/**
 * Lightweight repository pattern using Drizzle's native type inference
 * No duplicate models - Drizzle schema IS the source of truth
 */

import { db } from '@/server/db';
import { users, games, moves, gameEvents } from '@/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, and, gte, sql, desc, isNull } from 'drizzle-orm';
import type { Result } from '@/lib/utils/types';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';
import { isSuccess } from '@/lib/utils/type-guards';
import { createBrand } from '@/lib/utils/types';
import type { DatabaseError } from '@/lib/utils/database-types';

// Let Drizzle infer the types - no duplication!
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Game = InferSelectModel<typeof games>;
export type NewGame = InferInsertModel<typeof games>;
export type Move = InferSelectModel<typeof moves>;
export type NewMove = InferInsertModel<typeof moves>;
export type GameEvent = InferSelectModel<typeof gameEvents>;
export type NewGameEvent = InferInsertModel<typeof gameEvents>;

// Type alias for Result pattern with database operations
type DbResult<T> = Result<T, DatabaseError>;

/**
 * User repository - thin wrapper around Drizzle with business logic
 * NOT a model definition - uses Drizzle's types directly
 */
export const userRepo = {
  /**
   * Find by username - returns Drizzle's User type
   */
  async findByUsername(username: string): Promise<DbResult<User | undefined>> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      return createSuccess(user);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Get leaderboard - uses Drizzle's User type directly
   */
  async getLeaderboard(limit = 10): Promise<DbResult<User[]>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(and(eq(users.isActive, true), gte(users.gamesPlayed, 5)))
        .orderBy(desc(users.rating))
        .limit(limit);

      return createSuccess(result);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Update game stats - business logic only, no model duplication
   */
  async updateGameStats(
    userId: string,
    result: 'win' | 'loss' | 'draw',
    ratingChange: number
  ): Promise<DbResult<User>> {
    try {
      // Get current stats
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return createFailure({
          code: 'NOT_FOUND',
          message: `User ${userId} not found`,
          table: 'users',
        } as DatabaseError);
      }

      // Calculate updates
      const updates: Partial<NewUser> = {
        gamesPlayed: user.gamesPlayed + 1,
        rating: Math.max(0, user.rating + ratingChange),
        lastSeenAt: new Date(),
        ...(result === 'win' && { gamesWon: user.gamesWon + 1 }),
        ...(result === 'loss' && { gamesLost: user.gamesLost + 1 }),
        ...(result === 'draw' && { gamesDrawn: user.gamesDrawn + 1 }),
      };

      // Update and return
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      return createSuccess(updated);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Check ban status - pure business logic
   */
  async isBanned(userId: string): Promise<DbResult<boolean>> {
    const result = await this.findByUsername(userId);
    if (!isSuccess(result)) return result;

    const user = result.data;
    if (!user) return createSuccess(false);

    // Business logic for ban checking
    if (!user.isActive) return createSuccess(true);
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return createSuccess(true);
    }

    return createSuccess(false);
  },
};

/**
 * Game repository - thin wrapper with business logic
 */
export const gameRepo = {
  /**
   * Create a new game with proper defaults
   */
  async create(data: NewGame): Promise<DbResult<Game>> {
    try {
      // Add branded type safety
      if (data.whitePlayerId) {
        data.whitePlayerId = createBrand<string, 'UserId'>(data.whitePlayerId);
      }
      if (data.blackPlayerId) {
        data.blackPlayerId = createBrand<string, 'UserId'>(data.blackPlayerId);
      }

      const [game] = await db.insert(games).values(data).returning();

      return createSuccess(game);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Get active games for a user
   */
  async getActiveGames(userId: string): Promise<DbResult<Game[]>> {
    try {
      const result = await db
        .select()
        .from(games)
        .where(
          and(
            sql`${games.whitePlayerId} = ${userId} OR ${games.blackPlayerId} = ${userId}`,
            isNull(games.result)
          )
        )
        .orderBy(desc(games.startedAt));

      return createSuccess(result);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Complete a game with result
   */
  async complete(
    gameId: string,
    result: string,
    fenFinal: string
  ): Promise<DbResult<Game>> {
    try {
      const [updated] = await db
        .update(games)
        .set({
          result,
          fenFinal,
          completedAt: new Date(),
        })
        .where(eq(games.id, gameId))
        .returning();

      if (!updated) {
        return createFailure({
          code: 'NOT_FOUND',
          message: `Game ${gameId} not found`,
          table: 'games',
        } as DatabaseError);
      }

      return createSuccess(updated);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },
};

/**
 * Move repository for game history
 */
export const moveRepo = {
  /**
   * Add a move to game history
   */
  async addMove(move: NewMove): Promise<DbResult<Move>> {
    try {
      const [created] = await db.insert(moves).values(move).returning();

      return createSuccess(created);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },

  /**
   * Get all moves for a game
   */
  async getGameMoves(gameId: string): Promise<DbResult<Move[]>> {
    try {
      const result = await db
        .select()
        .from(moves)
        .where(eq(moves.gameId, gameId))
        .orderBy(moves.moveNumber);

      return createSuccess(result);
    } catch (error) {
      const dbError: DatabaseError = {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Database error',
        detail: error instanceof Error ? error.stack : undefined,
        table: 'users',
      };
      return createFailure(dbError);
    }
  },
};

/**
 * Helper to wrap any Drizzle operation in Result type
 */
export async function withResult<T>(
  operation: () => Promise<T>
): Promise<DbResult<T>> {
  try {
    const result = await operation();
    return createSuccess(result);
  } catch (error) {
    return createFailure({
      code: 'DATABASE_ERROR',
      message:
        error instanceof Error ? error.message : 'Database operation failed',
      detail: error instanceof Error ? error.stack : undefined,
    } as DatabaseError);
  }
}

/**
 * Transaction helper with Result pattern
 */
export async function transaction<T>(
  fn: Parameters<typeof db.transaction>[0]
): Promise<DbResult<T>> {
  try {
    const result = await db.transaction(
      fn as unknown as Parameters<typeof db.transaction>[0]
    );
    return createSuccess(result as T);
  } catch (error) {
    return createFailure({
      code: 'TRANSACTION_ERROR',
      message: error instanceof Error ? error.message : 'Transaction failed',
      detail: error instanceof Error ? error.stack : undefined,
    } as DatabaseError);
  }
}
