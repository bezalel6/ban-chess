/**
 * Base repository implementation with Result pattern for type-safe database operations
 */

import { db } from '@/server/db';
import type {
  DbResult,
  DbTransaction,
  BaseModel,
} from '@/lib/utils/database-types';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/**
 * Abstract base repository with common database operations
 */
export abstract class BaseRepository<
  TModel extends BaseModel,
  TCreate extends Partial<TModel>,
  TUpdate extends Partial<TModel>,
> {
  constructor(
    protected table: PgTable,
    protected modelName: string
  ) {}

  /**
   * Find a record by ID with Result pattern
   */
  async findById(id: string): Promise<DbResult<TModel | null>> {
    try {
      const result = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return {
        ok: true,
        value: result[0] as TModel | null,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('findById', error),
      };
    }
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(options?: {
    where?: Record<string, unknown>;
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    limit?: number;
    offset?: number;
  }): Promise<DbResult<TModel[]>> {
    try {
      let query = db.select().from(this.table);

      // Apply filters
      if (options?.where) {
        const conditions = Object.entries(options.where).map(([key, value]) =>
          eq(this.table[key], value)
        );
        query = query.where(and(...conditions));
      }

      // Apply ordering
      if (options?.orderBy) {
        const orderClauses = options.orderBy.map(({ field, direction }) =>
          direction === 'desc'
            ? desc(this.table[field])
            : asc(this.table[field])
        );
        query = query.orderBy(...orderClauses);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const result = await query;
      return {
        ok: true,
        value: result as TModel[],
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('findAll', error),
      };
    }
  }

  /**
   * Create a new record
   */
  async create(data: TCreate): Promise<DbResult<TModel>> {
    try {
      const result = await db.insert(this.table).values(data).returning();

      return {
        ok: true,
        value: result[0] as TModel,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('create', error),
      };
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: TUpdate): Promise<DbResult<TModel>> {
    try {
      const result = await db
        .update(this.table)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      if (result.length === 0) {
        return {
          ok: false,
          error: new Error(`${this.modelName} with id ${id} not found`),
        };
      }

      return {
        ok: true,
        value: result[0] as TModel,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('update', error),
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<DbResult<boolean>> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning();

      return {
        ok: true,
        value: result.length > 0,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('delete', error),
      };
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    fn: (tx: DbTransaction) => Promise<T>
  ): Promise<DbResult<T>> {
    try {
      const result = await db.transaction(async tx => {
        return await fn(tx as DbTransaction);
      });

      return {
        ok: true,
        value: result,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('transaction', error),
      };
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(where?: Record<string, unknown>): Promise<DbResult<number>> {
    try {
      let query = db.select({ count: sql<number>`count(*)` }).from(this.table);

      if (where) {
        const conditions = Object.entries(where).map(([key, value]) =>
          eq(this.table[key], value)
        );
        query = query.where(and(...conditions));
      }

      const result = await query;
      return {
        ok: true,
        value: Number(result[0]?.count || 0),
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createDbError('count', error),
      };
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<DbResult<boolean>> {
    const result = await this.count({ id });
    if (!result.ok) return result;

    return {
      ok: true,
      value: result.value > 0,
    };
  }

  /**
   * Create a database error with context
   */
  protected createDbError(operation: string, error: unknown): Error {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';
    return new Error(`${this.modelName} ${operation} failed: ${message}`);
  }
}
