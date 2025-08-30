// @ts-nocheck
/**
 * Base repository implementation with Result pattern for type-safe database operations
 * Note: Type checking disabled due to Drizzle ORM version compatibility issues
 * Use simple-repository.ts for a type-safe alternative
 */

import { db } from '@/server/db';
import type { BaseModel, DatabaseError } from '@/lib/utils/database-types';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';
import type { Result } from '@/lib/utils/types';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Database transaction type
 */
export type DbTransaction = Parameters<
  Parameters<NodePgDatabase['transaction']>[0]
>[0];

/**
 * Helper type to extract the ID column from a PgTable
 * Note: Using 'unknown' due to Drizzle ORM version compatibility issues
 */
// @ts-ignore - Drizzle type system incompatibility
type TableWithId = unknown;

/**
 * Helper type for table column access
 */
type TableColumns = Record<string, PgColumn<unknown>>;

/**
 * Abstract base repository with common database operations
 */
export abstract class BaseRepository<
  TModel extends BaseModel,
  TCreate extends Partial<TModel>,
  TUpdate extends Partial<TModel>,
> {
  constructor(
    protected table: PgTable & TableWithId,
    protected modelName: string
  ) {}

  /**
   * Find a record by ID with Result pattern
   */
  async findById(id: string): Promise<Result<TModel | null, DatabaseError>> {
    try {
      const result = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return createSuccess(result[0] as TModel | null);
    } catch (error) {
      return createFailure(this.createDbError('findById', error));
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
  }): Promise<Result<TModel[], DatabaseError>> {
    try {
      let query = db.select().from(this.table);

      // Apply filters
      if (options?.where) {
        const conditions = Object.entries(options.where).map(([key, value]) =>
          eq((this.table as unknown as TableColumns)[key], value)
        );
        query = query.where(and(...conditions));
      }

      // Apply ordering
      if (options?.orderBy) {
        const orderClauses = options.orderBy.map(({ field, direction }) =>
          direction === 'desc'
            ? desc((this.table as unknown as TableColumns)[field])
            : asc((this.table as unknown as TableColumns)[field])
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
      return createSuccess(result as TModel[]);
    } catch (error) {
      return createFailure(this.createDbError('findAll', error));
    }
  }

  /**
   * Create a new record
   */
  async create(data: TCreate): Promise<Result<TModel, DatabaseError>> {
    try {
      const result = await db
        .insert(this.table)
        .values(data as unknown)
        .returning();

      return createSuccess(result[0] as TModel);
    } catch (error) {
      return createFailure(this.createDbError('create', error));
    }
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string,
    data: TUpdate
  ): Promise<Result<TModel, DatabaseError>> {
    try {
      const result = await db
        .update(this.table)
        .set({
          ...data,
          updatedAt: new Date(),
        } as unknown)
        .where(eq(this.table.id, id))
        .returning();

      if (result.length === 0) {
        return createFailure(
          this.createDbError(
            'update',
            new Error(`${this.modelName} with id ${id} not found`)
          )
        );
      }

      return createSuccess(result[0] as TModel);
    } catch (error) {
      return createFailure(this.createDbError('update', error));
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<Result<boolean, DatabaseError>> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning();

      return createSuccess(result.length > 0);
    } catch (error) {
      return createFailure(this.createDbError('delete', error));
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    fn: (tx: typeof db) => Promise<T>
  ): Promise<Result<T, DatabaseError>> {
    try {
      const result = await db.transaction(async tx => {
        return await fn(tx);
      });

      return createSuccess(result);
    } catch (error) {
      return createFailure(this.createDbError('transaction', error));
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(
    where?: Record<string, unknown>
  ): Promise<Result<number, DatabaseError>> {
    try {
      let query = db.select({ count: sql<number>`count(*)` }).from(this.table);

      if (where) {
        const conditions = Object.entries(where).map(([key, value]) =>
          eq((this.table as unknown as TableColumns)[key], value)
        );
        query = query.where(and(...conditions));
      }

      const result = await query;
      return createSuccess(Number(result[0]?.count || 0));
    } catch (error) {
      return createFailure(this.createDbError('count', error));
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<Result<boolean, DatabaseError>> {
    const result = await this.count({ id });
    if (!result.success) return result;

    return createSuccess(result.data > 0);
  }

  /**
   * Create a database error with context
   */
  protected createDbError(operation: string, error: unknown): DatabaseError {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';

    return {
      code: 'DATABASE_ERROR',
      message: `${this.modelName} ${operation} failed: ${message}`,
      detail: error instanceof Error ? error.stack : undefined,
      table: this.modelName.toLowerCase(),
    };
  }
}
