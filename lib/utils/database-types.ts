/**
 * Database-specific TypeScript utility types for Drizzle ORM and PostgreSQL
 * Designed for the 2ban-2chess application's data layer
 */

import type { AsyncResult, Optional } from './types';

// ========================================
// DATABASE OPERATION TYPES
// ========================================

/**
 * Database operation result
 * @template T - The data type
 */
export type DbResult<T> = AsyncResult<T, DatabaseError>;

/**
 * Database error with context
 */
export interface DatabaseError {
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  table?: string;
  constraint?: string;
}

/**
 * Database transaction callback
 * @template T - The return type
 */
export type TransactionCallback<T> = () => Promise<T>;

/**
 * Database connection status
 */
export type DbConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// ========================================
// QUERY BUILDER TYPES
// ========================================

/**
 * SQL query with parameters
 */
export interface SqlQuery {
  query: string;
  params: unknown[];
}

/**
 * Query pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Query sorting options
 */
export interface SortOptions<T = string> {
  field: T;
  direction: 'asc' | 'desc';
}

/**
 * Query filtering options
 * @template T - The filterable fields type
 */
export interface FilterOptions<T = Record<string, unknown>> {
  where?: Partial<T>;
  search?: string;
  searchFields?: (keyof T)[];
}

/**
 * Complete query options
 * @template T - The model type
 */
export interface QueryOptions<T = Record<string, unknown>> {
  pagination?: PaginationOptions;
  sort?: SortOptions<keyof T>[];
  filter?: FilterOptions<T>;
  include?: string[];
}

// ========================================
// MODEL BASE TYPES
// ========================================

/**
 * Base fields for all database models
 */
export interface BaseModel {
  id: string;
  createdAt: Date;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteModel {
  deletedAt?: Date | null;
  isDeleted: boolean;
}

/**
 * Timestamped model with created/updated timestamps
 */
export interface TimestampedModel {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model with optional updatedAt field
 */
export interface OptionalUpdatedModel extends BaseModel {
  updatedAt?: Date;
}

/**
 * Model with audit trail
 */
export interface AuditableModel extends TimestampedModel {
  createdBy?: string;
  updatedBy?: string;
}

// ========================================
// REPOSITORY PATTERN TYPES
// ========================================

/**
 * Base repository interface
 * @template T - The model type
 * @template TCreate - The create input type
 * @template TUpdate - The update input type
 */
export interface BaseRepository<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  findById(id: string): DbResult<Optional<T>>;
  findMany(options?: QueryOptions<T>): DbResult<T[]>;
  create(data: TCreate): DbResult<T>;
  update(id: string, data: TUpdate): DbResult<T>;
  delete(id: string): DbResult<boolean>;
  count(filter?: FilterOptions<T>): DbResult<number>;
  exists(id: string): DbResult<boolean>;
}

/**
 * Repository with soft delete support
 * @template T - The model type
 * @template TCreate - The create input type
 * @template TUpdate - The update input type
 */
export interface SoftDeleteRepository<T, TCreate = Partial<T>, TUpdate = Partial<T>> 
  extends BaseRepository<T, TCreate, TUpdate> {
  softDelete(id: string): DbResult<boolean>;
  restore(id: string): DbResult<boolean>;
  findWithDeleted(options?: QueryOptions<T>): DbResult<T[]>;
  findDeleted(options?: QueryOptions<T>): DbResult<T[]>;
}

// ========================================
// SPECIFIC MODEL TYPES
// ========================================

/**
 * User model type based on database schema
 */
export interface UserModel extends BaseModel {
  username: string;
  email?: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  role: 'player' | 'moderator' | 'admin' | 'super_admin';
  isActive: boolean;
  bannedUntil?: Date | null;
  banReason?: string | null;
  lastSeenAt: Date;
}

/**
 * Game model type based on database schema
 */
export interface GameModel extends BaseModel {
  whitePlayerId?: string;
  blackPlayerId?: string;
  pgn?: string;
  fenInitial: string;
  fenFinal?: string;
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  timeControl?: {
    initial: number;
    increment: number;
  };
  isSoloGame: boolean;
  startedAt: Date;
  completedAt?: Date;
  totalMoves: number;
  totalBans: number;
  banMoves: string[];
  finalPosition?: Record<string, string | number | boolean>;
}

/**
 * Move model type based on database schema
 */
export interface MoveModel extends BaseModel {
  gameId: string;
  moveNumber: number;
  color: 'white' | 'black';
  notation: string;
  uci?: string;
  fenAfter: string;
  clockWhite?: number;
  clockBlack?: number;
  isBan: boolean;
  evaluation?: number;
}

/**
 * Game event model type
 */
export interface GameEventModel extends BaseModel {
  gameId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
}

// ========================================
// CREATE/UPDATE INPUT TYPES
// ========================================

/**
 * User creation input
 */
export interface CreateUserInput {
  username: string;
  email?: string;
  rating?: number;
  role?: UserModel['role'];
}

/**
 * User update input
 */
export interface UpdateUserInput {
  username?: string;
  email?: string;
  rating?: number;
  role?: UserModel['role'];
  isActive?: boolean;
  bannedUntil?: Date | null;
  banReason?: string | null;
}

/**
 * Game creation input
 */
export interface CreateGameInput {
  whitePlayerId?: string;
  blackPlayerId?: string;
  timeControl?: GameModel['timeControl'];
  isSoloGame?: boolean;
  fenInitial?: string;
}

/**
 * Game update input
 */
export interface UpdateGameInput {
  pgn?: string;
  fenFinal?: string;
  result?: GameModel['result'];
  completedAt?: Date;
  totalMoves?: number;
  totalBans?: number;
  banMoves?: string[];
  finalPosition?: GameModel['finalPosition'];
}

// ========================================
// QUERY RESULT TYPES
// ========================================

/**
 * Paginated query result
 * @template T - The model type
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * User with game statistics
 */
export interface UserWithStats extends UserModel {
  winRate: number;
  averageGameDuration: number;
  favoriteTimeControl?: GameModel['timeControl'];
  recentGames: GameModel[];
}

/**
 * Game with player information
 */
export interface GameWithPlayers extends GameModel {
  whitePlayer?: Pick<UserModel, 'id' | 'username' | 'rating'>;
  blackPlayer?: Pick<UserModel, 'id' | 'username' | 'rating'>;
}

/**
 * Game with full details including moves
 */
export interface GameWithDetails extends GameWithPlayers {
  moves: MoveModel[];
  events: GameEventModel[];
}

// ========================================
// DATABASE UTILITY FUNCTIONS
// ========================================

/**
 * Type guard to check if an error is a database error
 * @param error - The error to check
 * @returns True if error is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Create a database error from a raw error
 * @param error - The raw error
 * @param context - Additional context
 * @returns Formatted database error
 */
export function createDatabaseError(
  error: unknown, 
  context?: Partial<DatabaseError>
): DatabaseError {
  const baseError: DatabaseError = {
    code: 'DATABASE_ERROR',
    message: error instanceof Error ? error.message : 'Unknown database error',
  };

  if (context) {
    return { ...baseError, ...context };
  }

  return baseError;
}

/**
 * Calculate pagination offset from page and limit
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @returns Offset value
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create pagination result
 * @template T - The item type
 * @param data - The data array
 * @param total - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build WHERE clause conditions
 * @template T - The model type
 * @param filter - Filter options
 * @returns SQL conditions object
 */
export function buildWhereConditions<T extends Record<string, unknown>>(
  filter: FilterOptions<T>
): Record<string, unknown> {
  const conditions: Record<string, unknown> = {};

  if (filter.where) {
    Object.assign(conditions, filter.where);
  }

  return conditions;
}