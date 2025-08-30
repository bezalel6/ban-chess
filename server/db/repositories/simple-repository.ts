/**
 * Simplified type-safe repository with minimal complexity
 * Focused on working TypeScript without Drizzle's complex type system conflicts
 */

import { db } from '@/server/db';
import { users, games, moves } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { InferInsertModel } from 'drizzle-orm';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';
import type { Result } from '@/lib/utils/types';
import type { DatabaseError } from '@/lib/utils/database-types';

/**
 * Types for repository operations - using unknown for flexibility
 */
type UserRecord = Record<string, unknown>;
type GameRecord = Record<string, unknown>;
type MoveRecord = Record<string, unknown>;

/**
 * Create a standardized database error
 */
function createDbError(
  operation: string,
  table: string,
  error: unknown
): DatabaseError {
  return {
    code: 'DATABASE_ERROR',
    message: `${table} ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    detail: error instanceof Error ? error.stack : undefined,
    table,
  };
}

/**
 * User repository operations
 */
export const userRepository = {
  async findByUsername(
    username: string
  ): Promise<Result<UserRecord | null, DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      return createSuccess(result[0] || null);
    } catch (error) {
      return createFailure(createDbError('findByUsername', 'users', error));
    }
  },

  async findByEmail(
    email: string
  ): Promise<Result<UserRecord | null, DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return createSuccess(result[0] || null);
    } catch (error) {
      return createFailure(createDbError('findByEmail', 'users', error));
    }
  },

  async findById(
    id: string
  ): Promise<Result<UserRecord | null, DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return createSuccess(result[0] || null);
    } catch (error) {
      return createFailure(createDbError('findById', 'users', error));
    }
  },

  async create(
    userData: Record<string, unknown>
  ): Promise<Result<UserRecord, DatabaseError>> {
    try {
      const result = await db
        .insert(users)
        .values(userData as InferInsertModel<typeof users>)
        .returning();

      return createSuccess(result[0]);
    } catch (error) {
      return createFailure(createDbError('create', 'users', error));
    }
  },

  async update(
    id: string,
    userData: Record<string, unknown>
  ): Promise<Result<UserRecord, DatabaseError>> {
    try {
      const result = await db
        .update(users)
        .set({ ...userData, lastSeenAt: new Date() } as Partial<
          InferInsertModel<typeof users>
        >)
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        return createFailure(
          createDbError(
            'update',
            'users',
            new Error(`User with id ${id} not found`)
          )
        );
      }

      return createSuccess(result[0]);
    } catch (error) {
      return createFailure(createDbError('update', 'users', error));
    }
  },
};

/**
 * Game repository operations
 */
export const gameRepository = {
  async findById(
    id: string
  ): Promise<Result<GameRecord | null, DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(games)
        .where(eq(games.id, id))
        .limit(1);

      return createSuccess(result[0] || null);
    } catch (error) {
      return createFailure(createDbError('findById', 'games', error));
    }
  },

  async create(
    gameData: Record<string, unknown>
  ): Promise<Result<GameRecord, DatabaseError>> {
    try {
      const result = await db
        .insert(games)
        .values(gameData as InferInsertModel<typeof games>)
        .returning();

      return createSuccess(result[0]);
    } catch (error) {
      return createFailure(createDbError('create', 'games', error));
    }
  },

  async update(
    id: string,
    gameData: Record<string, unknown>
  ): Promise<Result<GameRecord, DatabaseError>> {
    try {
      const result = await db
        .update(games)
        .set(gameData as Partial<InferInsertModel<typeof games>>)
        .where(eq(games.id, id))
        .returning();

      if (result.length === 0) {
        return createFailure(
          createDbError(
            'update',
            'games',
            new Error(`Game with id ${id} not found`)
          )
        );
      }

      return createSuccess(result[0]);
    } catch (error) {
      return createFailure(createDbError('update', 'games', error));
    }
  },
};

/**
 * Move repository operations
 */
export const moveRepository = {
  async findByGameId(
    gameId: string
  ): Promise<Result<MoveRecord[], DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(moves)
        .where(eq(moves.gameId, gameId))
        .orderBy(moves.moveNumber);

      return createSuccess(result);
    } catch (error) {
      return createFailure(createDbError('findByGameId', 'moves', error));
    }
  },

  async create(
    moveData: Record<string, unknown>
  ): Promise<Result<MoveRecord, DatabaseError>> {
    try {
      const result = await db
        .insert(moves)
        .values(moveData as InferInsertModel<typeof moves>)
        .returning();

      return createSuccess(result[0]);
    } catch (error) {
      return createFailure(createDbError('create', 'moves', error));
    }
  },
};
