/**
 * Comprehensive TypeScript utility types for the 2ban-2chess application
 *
 * This module exports all utility types organized by category for easy importing.
 * Use named imports to get only the types you need in your components.
 *
 * @example
 * ```typescript
 * // Import specific types
 * import type { Result, AsyncResult, GameId } from '@/lib/utils';
 *
 * // Import API types
 * import type { ApiResponse, RouteHandler } from '@/lib/utils/api-types';
 *
 * // Import React component types
 * import type { ChessBoardProps, ButtonProps } from '@/lib/utils/react-types';
 * ```
 */

// ========================================
// CORE UTILITY TYPES
// ========================================

export type {
  // Result and Error Handling
  Result,
  Success,
  Failure,
  AsyncResult,
  Optional,
  Maybe,

  // Object Manipulation
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  RequireKeys,
  OptionalKeys,
  StrictNonNullable,
  Mutable,
  DeepMutable,

  // Array Utilities
  ArrayElement,
  NonEmptyArray,
  Head,
  Tail,
  Last,
  Length,

  // Function Utilities
  Parameters,
  ReturnType,
  Awaited,
  Fn,
  AsyncFn,
  OptionalParams,

  // Key-Value Utilities
  ValueOf,
  KeyValuePair,
  StringKeys,
  NumberKeys,
  SymbolKeys,
  Entries,

  // Conditional Types
  If,
  Equals,
  Extends,
  NotNullish,
  IsAny,
  IsNever,
  IsUnknown,

  // JSON Types
  JsonPrimitive,
  JsonValue,
  JsonObject,
  JsonArray,
  JsonSerializable,

  // Branded Types
  Brand,
  MultiBrand,
  GameId,
  UserId,
  Square,
  FEN,
  PGN,
  UCI,
  SAN,
  Timestamp,
  Rating,
  TimeControl,

  // Utility Functions
  createBrand,
  unwrapBrand,
  isBrandedType,
} from './types';

// ========================================
// API UTILITY TYPES
// ========================================

export type {
  // Response Types
  ApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  ApiSuccessResponse,

  // HTTP Types
  HttpMethod,
  HttpStatusCode,

  // Route Handler Types
  RouteContext,
  RouteHandler,
  ApiRouteHandlers,

  // Validation Types
  QueryParamsSchema,
  QueryParams,
  ValidatedBody,
  ValidationError as ApiValidationError,

  // Client Types
  ApiClientConfig,
  ApiRequestOptions,
  ApiClientResponse,

  // Utility Functions
  createApiResponse,
  createApiError,
  createPaginatedResponse,
  isApiError,
  isApiSuccess,
} from './api-types';

// Import namespace types
export type { UserApi, GameApi } from './api-types';

// ========================================
// DATABASE UTILITY TYPES
// ========================================

export type {
  // Operation Types
  DbResult,
  DatabaseError,
  TransactionCallback,
  DbConnectionStatus,

  // Query Types
  SqlQuery,
  PaginationOptions,
  SortOptions,
  FilterOptions,
  QueryOptions,

  // Model Base Types
  BaseModel,
  SoftDeleteModel,
  TimestampedModel,
  AuditableModel,

  // Repository Types
  BaseRepository,
  SoftDeleteRepository,

  // Specific Models
  UserModel,
  GameModel,
  MoveModel,
  GameEventModel,

  // Input Types
  CreateUserInput,
  UpdateUserInput,
  CreateGameInput,
  UpdateGameInput,

  // Result Types
  PaginatedResult,
  UserWithStats,
  GameWithPlayers,
  GameWithDetails,

  // Utility Functions
  isDatabaseError,
  createDatabaseError,
  calculateOffset,
  createPaginatedResult,
  buildWhereConditions,
} from './database-types';

// ========================================
// WEBSOCKET UTILITY TYPES
// ========================================

export type {
  // Connection Types
  WsConnectionState,
  WsReadyState,
  WsCloseCode,
  WsConnectionConfig,

  // Message Types
  BaseWsMessage,
  WsMessageWithPayload,
  WsErrorMessage,
  WsAckMessage,

  // Game Messages
  WsAuthMessage,
  WsAuthResponseMessage,
  WsGameStateMessage,
  WsActionMessage,
  WsJoinGameMessage,
  WsJoinQueueMessage,
  WsQueueStatusMessage,
  WsMatchFoundMessage,
  WsClockUpdateMessage,
  WsGameEventMessage,
  WsPingMessage,
  WsPongMessage,

  // Message Unions
  ClientMessage,
  ServerMessage,
  WsMessage,

  // Handler Types
  WsEventHandler,
  WsConnectionHandlers,
  WsGameHandlers,

  // Client/Server Types
  WsClient,
  WsServerClient,
  WsServer,

  // Utility Types
  MessageType,
  MessageByType,
  WsConnectionMetrics,
  WsRateLimit,

  // Branded Types
  WsClientId,
  WsSessionId,
  WsMessageId,

  // Utility Functions
  isMessageType,
  createWsMessage,
  isErrorMessage,
  isAckMessage,
  getReadyStateName,
} from './websocket-types';

// ========================================
// REACT COMPONENT TYPES
// ========================================

export type {
  // Component Utilities
  RequireProps,
  OptionalProps,
  PropsOf,
  WithChildren,
  WithOptionalChildren,
  WithClassName,
  WithStyle,
  WithHtmlAttributes,
  PolymorphicProps,

  // Form Types
  BaseFieldProps,
  TextFieldProps,
  SelectFieldProps,
  ButtonProps,

  // Hook Types
  HookReturnType,
  AsyncHookState,
  AsyncHookActions,
  AsyncHook,
  UseLocalStorageReturn,
  UseToggleReturn,

  // Ref Types
  AnyRef,
  RefCallback,
  CombinedRef,

  // Event Handler Types
  EventHandler,
  FormEventHandlers,
  MouseEventHandlers,

  // Game-Specific Types
  ChessSquare,
  PieceType,
  PieceColor,
  ChessPiece,
  BoardPosition,
  ChessMove,
  ChessBoardProps,
  GameStatusProps,
  MoveHistoryProps,

  // Context Types
  ContextProviderProps,
  GameContextValue,
  AuthContextValue,

  // Render Prop Types
  RenderProp,
  WithRenderProp,
  WithChildrenOrRenderProp,

  // Utility Functions
  isRenderProp,
  isRefObject,
  isRefCallback,
  createChessSquare,
  parseChessSquare,
} from './react-types';

// ========================================
// ERROR HANDLING TYPES
// ========================================

export type {
  // Base Error Types
  ErrorSeverity,
  ErrorCategory,
  BaseAppError,
  UserFacingError,

  // Specific Error Types
  ValidationError,
  AuthError,
  AuthzError,
  NetworkError,
  DatabaseError as DbError,
  BusinessError,
  GameError,
  WebSocketError,

  // Error Unions
  AppError,
  DisplayableError,

  // Result Types
  AppResult,
  AsyncAppResult,
  ValidationResult,

  // Handler Types
  ErrorHandler,
  ErrorRecovery,
  ErrorReporter,
  ErrorHandlingConfig,

  // Branded Types
  ErrorId,
  TraceId,
  SessionId,

  // Factory Functions
  createValidationError,
  createAuthError,
  createNetworkError,
  createGameError,

  // Utility Functions
  isAppError,
  isValidationError,
  isRetryableError,
  getUserMessage,
  toAppError,
} from './error-types';

// ========================================
// TYPE GUARDS AND ASSERTIONS
// ========================================

/**
 * Common type guards that can be used throughout the application
 */

/**
 * Check if a value is defined (not null or undefined)
 * @param value - The value to check
 * @returns True if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if a value is a string
 * @param value - The value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if a value is a number
 * @param value - The value to check
 * @returns True if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if a value is a boolean
 * @param value - The value to check
 * @returns True if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if a value is an object (not null, not array)
 * @param value - The value to check
 * @returns True if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is an array
 * @param value - The value to check
 * @returns True if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if a value is a function
 * @param value - The value to check
 * @returns True if value is a function
 */
export function isFunction(
  value: unknown
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Assert that a value is defined, throw if not
 * @param value - The value to assert
 * @param message - Optional error message
 * @throws Error if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message ?? 'Value must be defined');
  }
}

/**
 * Assert that a condition is true, throw if not
 * @param condition - The condition to check
 * @param message - Optional error message
 * @throws Error if condition is false
 */
export function assert(
  condition: unknown,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}
