/**
 * Error handling and validation utility types
 * Designed for robust error management in the 2ban-2chess application
 */

import type { Result, AsyncResult, Brand } from './types';

// ========================================
// BASE ERROR TYPES
// ========================================

/**
 * Application error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'database'
  | 'business'
  | 'system'
  | 'external'
  | 'unknown';

/**
 * Base application error interface
 */
export interface BaseAppError {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;
  readonly stack?: string;
}

/**
 * Extended error with user-friendly information
 */
export interface UserFacingError extends BaseAppError {
  readonly userMessage: string;
  readonly suggestions?: string[];
  readonly recoverable: boolean;
}

/**
 * Validation error for form fields and input
 */
export interface ValidationError extends BaseAppError {
  readonly category: 'validation';
  readonly field: string;
  readonly value?: unknown;
  readonly constraint: string;
  readonly expected?: unknown;
}

/**
 * Authentication error
 */
export interface AuthError extends BaseAppError {
  readonly category: 'authentication';
  readonly provider?: string;
  readonly userId?: string;
  readonly reason: 'invalid_credentials' | 'token_expired' | 'account_locked' | 'provider_error' | 'unknown';
}

/**
 * Authorization error
 */
export interface AuthzError extends BaseAppError {
  readonly category: 'authorization';
  readonly resource: string;
  readonly action: string;
  readonly userId?: string;
  readonly role?: string;
  readonly requiredPermissions: string[];
}

/**
 * Network/API error
 */
export interface NetworkError extends BaseAppError {
  readonly category: 'network';
  readonly url?: string;
  readonly method?: string;
  readonly statusCode?: number;
  readonly responseBody?: unknown;
  readonly timeout?: boolean;
  readonly retryable: boolean;
}

/**
 * Database operation error
 */
export interface DatabaseError extends BaseAppError {
  readonly category: 'database';
  readonly operation: string;
  readonly table?: string;
  readonly constraint?: string;
  readonly query?: string;
  readonly connectionId?: string;
}

/**
 * Business logic error
 */
export interface BusinessError extends BaseAppError {
  readonly category: 'business';
  readonly rule: string;
  readonly entityId?: string;
  readonly entityType?: string;
}

// ========================================
// GAME-SPECIFIC ERROR TYPES
// ========================================

/**
 * Chess game related errors
 */
export interface GameError extends BaseAppError {
  readonly category: 'business';
  readonly gameId?: string;
  readonly playerId?: string;
  readonly errorType: 'invalid_move' | 'game_not_found' | 'player_not_in_game' | 'game_over' | 'not_player_turn' | 'invalid_ban';
}

/**
 * WebSocket connection errors
 */
export interface WebSocketError extends BaseAppError {
  readonly category: 'network';
  readonly connectionId?: string;
  readonly closeCode?: number;
  readonly wasClean?: boolean;
  readonly reason?: string;
}

// ========================================
// ERROR UNION TYPES
// ========================================

/**
 * All possible application errors
 */
export type AppError = 
  | ValidationError
  | AuthError
  | AuthzError
  | NetworkError
  | DatabaseError
  | BusinessError
  | GameError
  | WebSocketError
  | BaseAppError;

/**
 * Errors that can be shown to users
 */
export type DisplayableError = UserFacingError | ValidationError | BusinessError | GameError;

// ========================================
// ERROR RESULT TYPES
// ========================================

/**
 * Result type with application error
 * @template T - Success value type
 */
export type AppResult<T> = Result<T, AppError>;

/**
 * Async result with application error
 * @template T - Success value type
 */
export type AsyncAppResult<T> = AsyncResult<T, AppError>;

/**
 * Validation result for form fields
 * @template T - The validated value type
 */
export type ValidationResult<T> = Result<T, ValidationError[]>;

// ========================================
// ERROR HANDLER TYPES
// ========================================

/**
 * Error handler function
 * @template T - The error type
 */
export type ErrorHandler<T extends AppError = AppError> = (error: T) => void | Promise<void>;

/**
 * Error recovery function
 * @template T - The error type
 * @template R - The recovery result type
 */
export type ErrorRecovery<T extends AppError = AppError, R = unknown> = (error: T) => R | Promise<R>;

/**
 * Error reporting function
 * @template T - The error type
 */
export type ErrorReporter<T extends AppError = AppError> = (error: T) => void | Promise<void>;

/**
 * Comprehensive error handling configuration
 */
export interface ErrorHandlingConfig {
  handlers: {
    [K in ErrorCategory]?: ErrorHandler<Extract<AppError, { category: K }>>;
  };
  recovery?: {
    [K in ErrorCategory]?: ErrorRecovery<Extract<AppError, { category: K }>>;
  };
  reporting?: {
    [K in ErrorSeverity]?: ErrorReporter;
  };
  fallback?: ErrorHandler;
}

// ========================================
// BRANDED ERROR TYPES
// ========================================

export type ErrorId = Brand<string, 'ErrorId'>;
export type TraceId = Brand<string, 'TraceId'>;
export type SessionId = Brand<string, 'SessionId'>;

// ========================================
// ERROR FACTORY FUNCTIONS
// ========================================

/**
 * Create a validation error
 * @param field - The field name
 * @param message - The error message
 * @param options - Additional options
 * @returns Validation error
 */
export function createValidationError(
  field: string,
  message: string,
  options?: {
    code?: string;
    value?: unknown;
    constraint?: string;
    expected?: unknown;
    context?: Record<string, unknown>;
  }
): ValidationError {
  return {
    code: options?.code ?? 'VALIDATION_ERROR',
    message,
    category: 'validation',
    severity: 'medium',
    timestamp: Date.now(),
    field,
    value: options?.value,
    constraint: options?.constraint ?? 'unknown',
    expected: options?.expected,
    context: options?.context,
  };
}

/**
 * Create an authentication error
 * @param reason - The authentication failure reason
 * @param message - The error message
 * @param options - Additional options
 * @returns Authentication error
 */
export function createAuthError(
  reason: AuthError['reason'],
  message?: string,
  options?: {
    code?: string;
    provider?: string;
    userId?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): AuthError {
  return {
    code: options?.code ?? 'AUTH_ERROR',
    message: message ?? `Authentication failed: ${reason}`,
    category: 'authentication',
    severity: reason === 'account_locked' ? 'high' : 'medium',
    timestamp: Date.now(),
    provider: options?.provider,
    userId: options?.userId,
    reason,
    context: options?.context,
    cause: options?.cause,
  };
}

/**
 * Create a network error
 * @param message - The error message
 * @param options - Additional options
 * @returns Network error
 */
export function createNetworkError(
  message: string,
  options?: {
    code?: string;
    url?: string;
    method?: string;
    statusCode?: number;
    responseBody?: unknown;
    timeout?: boolean;
    retryable?: boolean;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): NetworkError {
  return {
    code: options?.code ?? 'NETWORK_ERROR',
    message,
    category: 'network',
    severity: options?.statusCode && options.statusCode >= 500 ? 'high' : 'medium',
    timestamp: Date.now(),
    url: options?.url,
    method: options?.method,
    statusCode: options?.statusCode,
    responseBody: options?.responseBody,
    timeout: options?.timeout ?? false,
    retryable: options?.retryable ?? (options?.statusCode ? options.statusCode >= 500 : false),
    context: options?.context,
    cause: options?.cause,
  };
}

/**
 * Create a game error
 * @param errorType - The game error type
 * @param message - The error message
 * @param options - Additional options
 * @returns Game error
 */
export function createGameError(
  errorType: GameError['errorType'],
  message?: string,
  options?: {
    code?: string;
    gameId?: string;
    playerId?: string;
    context?: Record<string, unknown>;
  }
): GameError {
  return {
    code: options?.code ?? 'GAME_ERROR',
    message: message ?? `Game error: ${errorType}`,
    category: 'business',
    severity: 'medium',
    timestamp: Date.now(),
    gameId: options?.gameId,
    playerId: options?.playerId,
    errorType,
    context: options?.context,
  };
}

// ========================================
// ERROR UTILITY FUNCTIONS
// ========================================

/**
 * Type guard to check if an error is an application error
 * @param error - The error to check
 * @returns True if error is an application error
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'category' in error &&
    'severity' in error &&
    'timestamp' in error
  );
}

/**
 * Type guard to check if an error is a validation error
 * @param error - The error to check
 * @returns True if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return isAppError(error) && error.category === 'validation' && 'field' in error;
}

/**
 * Type guard to check if an error is retryable
 * @param error - The error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!isAppError(error)) return false;
  
  if (error.category === 'network') {
    return (error as NetworkError).retryable;
  }
  
  if (error.category === 'database') {
    return error.severity !== 'critical';
  }
  
  return false;
}

/**
 * Extract user-friendly message from an error
 * @param error - The error
 * @returns User-friendly message
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    if ('userMessage' in error) {
      return (error as UserFacingError).userMessage;
    }
    
    switch (error.category) {
      case 'validation':
        return error.message;
      case 'authentication':
        return 'Authentication failed. Please try signing in again.';
      case 'authorization':
        return 'You do not have permission to perform this action.';
      case 'network':
        return 'Network error. Please check your connection and try again.';
      case 'business':
        return error.message;
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Convert a generic error to an application error
 * @param error - The generic error
 * @param category - The error category
 * @param options - Additional options
 * @returns Application error
 */
export function toAppError(
  error: unknown,
  category: ErrorCategory = 'unknown',
  options?: {
    code?: string;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  }
): BaseAppError {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  return {
    code: options?.code ?? 'UNKNOWN_ERROR',
    message,
    category,
    severity: options?.severity ?? 'medium',
    timestamp: Date.now(),
    context: options?.context,
    cause: error instanceof Error ? error : undefined,
    stack,
  };
}