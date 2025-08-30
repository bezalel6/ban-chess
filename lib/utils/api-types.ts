/**
 * API-specific TypeScript utility types for Next.js routes and responses
 * Designed for the 2ban-2chess application's REST API endpoints
 */

import type { NextRequest, NextResponse } from 'next/server';
import type { Result, AsyncResult } from './types';

// ========================================
// API RESPONSE TYPES
// ========================================

/**
 * Standard API response wrapper
 * @template T - The data type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Paginated API response
 * @template T - The item type in the data array
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * API error response with detailed information
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * API success response
 * @template T - The data type
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// ========================================
// HTTP METHOD TYPES
// ========================================

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP status codes commonly used in the application
 */
export type HttpStatusCode = 
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

// ========================================
// ROUTE HANDLER TYPES
// ========================================

/**
 * Generic route context for dynamic routes
 * @template T - The params type
 */
export interface RouteContext<T = Record<string, string>> {
  params: Promise<T>;
}

/**
 * Route handler function type
 * @template TParams - Route parameters type
 * @template TResponse - Response data type
 */
export type RouteHandler<TParams = Record<string, string>, TResponse = unknown> = (
  request: NextRequest,
  context: RouteContext<TParams>
) => Promise<NextResponse<ApiResponse<TResponse>>>;

/**
 * API route handler with specific HTTP method
 * @template TParams - Route parameters type
 * @template TRequest - Request body type
 * @template TResponse - Response data type
 */
export interface ApiRouteHandlers<
  TParams = Record<string, string>,
  _TRequest = unknown,
  TResponse = unknown
> {
  GET?: RouteHandler<TParams, TResponse>;
  POST?: RouteHandler<TParams, TResponse>;
  PUT?: RouteHandler<TParams, TResponse>;
  PATCH?: RouteHandler<TParams, TResponse>;
  DELETE?: RouteHandler<TParams, TResponse>;
}

// ========================================
// REQUEST VALIDATION TYPES
// ========================================

/**
 * Query parameters validation schema
 */
export interface QueryParamsSchema {
  [key: string]: 'string' | 'number' | 'boolean' | 'array';
}

/**
 * Extract query parameters type from schema
 * @template T - The query params schema
 */
export type QueryParams<T extends QueryParamsSchema> = {
  [K in keyof T]: T[K] extends 'string' 
    ? string 
    : T[K] extends 'number'
    ? number
    : T[K] extends 'boolean'
    ? boolean
    : T[K] extends 'array'
    ? string[]
    : never;
};

/**
 * Request body validation result
 * @template T - The validated body type
 */
export type ValidatedBody<T> = Result<T, ValidationError>;

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ========================================
// API CLIENT TYPES
// ========================================

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

/**
 * API request options
 * @template T - Request body type
 */
export interface ApiRequestOptions<T = unknown> {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: T;
  params?: Record<string, string>;
  timeout?: number;
}

/**
 * API client response
 * @template T - Response data type
 */
export type ApiClientResponse<T> = AsyncResult<ApiResponse<T>, ApiErrorResponse>;

// ========================================
// SPECIFIC API ENDPOINT TYPES
// ========================================

/**
 * User-related API types
 */
export namespace UserApi {
  export interface GetUserParams {
    username: string;
  }

  export interface UserGamesQuery {
    limit?: number;
    offset?: number;
    status?: 'completed' | 'ongoing' | 'all';
  }

  export interface GameRecord {
    id: string;
    opponent: string;
    result: 'win' | 'loss' | 'draw';
    playerColor: 'white' | 'black';
    duration: string;
    date: string;
    totalMoves: number;
  }

  export interface UserGamesResponse {
    games: GameRecord[];
    total: number;
    limit: number;
    offset: number;
  }

  export interface UserStatsResponse {
    username: string;
    rating: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    gamesDrawn: number;
    winRate: number;
  }
}

/**
 * Game-related API types
 */
export namespace GameApi {
  export interface CreateGameRequest {
    timeControl?: {
      initial: number;
      increment: number;
    };
    isSoloGame?: boolean;
  }

  export interface GameMoveRequest {
    gameId: string;
    action: {
      move?: { from: string; to: string; promotion?: string };
      ban?: { from: string; to: string };
    };
  }

  export interface GameResponse {
    id: string;
    fen: string;
    players: {
      white?: string;
      black?: string;
    };
    status: 'waiting' | 'ongoing' | 'completed';
    result?: string;
    timeControl?: {
      initial: number;
      increment: number;
    };
  }
}

// ========================================
// API UTILITY FUNCTIONS
// ========================================

/**
 * Create a standardized API response
 * @template T - The data type
 * @param data - The response data
 * @param message - Optional success message
 * @returns Standardized API success response
 */
export function createApiResponse<T>(
  data: T, 
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized API error response
 * @param error - The error message
 * @param code - Optional error code
 * @param details - Optional error details
 * @returns Standardized API error response
 */
export function createApiError(
  error: string,
  code?: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    message: error,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 * @template T - The item type
 * @param data - The data array
 * @param pagination - Pagination information
 * @returns Paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedResponse<T>['pagination']
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Type guard to check if a response is an error
 * @param response - The API response
 * @returns True if response is an error
 */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return !response.success;
}

/**
 * Type guard to check if a response is successful
 * @template T - The data type
 * @param response - The API response
 * @returns True if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Alias for createApiError for consistency
 */
export const createErrorResponse = createApiError;