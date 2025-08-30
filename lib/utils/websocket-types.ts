/**
 * WebSocket-specific TypeScript utility types for real-time game communication
 * Designed for the 2ban-2chess application's WebSocket server and client
 */

import type { Optional, Brand } from './types';

// ========================================
// WEBSOCKET CONNECTION TYPES
// ========================================

/**
 * WebSocket connection state
 */
export type WsConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

/**
 * WebSocket ready states (standard values)
 */
export type WsReadyState = 0 | 1 | 2 | 3; // CONNECTING | OPEN | CLOSING | CLOSED

/**
 * WebSocket close codes
 */
export type WsCloseCode =
  | 1000 // Normal Closure
  | 1001 // Going Away
  | 1002 // Protocol Error
  | 1003 // Unsupported Data
  | 1006 // Abnormal Closure
  | 1007 // Invalid frame payload data
  | 1008 // Policy Violation
  | 1009 // Message Too Big
  | 1010 // Mandatory Extension
  | 1011 // Internal Server Error
  | 1015; // TLS handshake

/**
 * WebSocket connection configuration
 */
export interface WsConnectionConfig {
  url: string;
  protocols?: string[];
  heartbeat?: {
    interval: number;
    timeout: number;
    message: string;
    returnMessage: string;
  };
  reconnect?: {
    enabled: boolean;
    attempts: number;
    delay: number;
    maxDelay: number;
    backoff: number;
  };
  debug?: boolean;
}

// ========================================
// MESSAGE TYPE SYSTEM
// ========================================

/**
 * Base WebSocket message structure
 */
export interface BaseWsMessage {
  type: string;
  timestamp?: number;
  requestId?: string;
}

/**
 * WebSocket message with payload
 * @template T - The payload type
 */
export interface WsMessageWithPayload<T = unknown> extends BaseWsMessage {
  payload: T;
}

/**
 * WebSocket error message
 */
export interface WsErrorMessage extends BaseWsMessage {
  type: 'error';
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * WebSocket acknowledgment message
 */
export interface WsAckMessage extends BaseWsMessage {
  type: 'ack';
  originalType: string;
  success: boolean;
  message?: string;
}

// ========================================
// GAME-SPECIFIC MESSAGE TYPES
// ========================================

/**
 * Authentication message from client
 */
export interface WsAuthMessage extends BaseWsMessage {
  type: 'authenticate';
  userId: string;
  username: string;
  provider?: string;
  token?: string;
}

/**
 * Authentication response from server
 */
export interface WsAuthResponseMessage extends BaseWsMessage {
  type: 'authenticated';
  userId: string;
  username: string;
  sessionId?: string;
}

/**
 * Game state update message
 */
export interface WsGameStateMessage extends BaseWsMessage {
  type: 'state';
  gameId: string;
  fen: string;
  players: {
    white?: string;
    black?: string;
  };
  playerColor?: 'white' | 'black';
  legalActions?: string[];
  nextAction?: 'move' | 'ban';
  gameOver?: boolean;
  result?: string;
  inCheck?: boolean;
  timeControl?: {
    initial: number;
    increment: number;
  };
  clocks?: {
    white: { remaining: number; lastUpdate: number };
    black: { remaining: number; lastUpdate: number };
  };
}

/**
 * Player action message (move or ban)
 */
export interface WsActionMessage extends BaseWsMessage {
  type: 'action';
  gameId: string;
  action: {
    move?: { from: string; to: string; promotion?: string };
    ban?: { from: string; to: string };
  };
}

/**
 * Game join message
 */
export interface WsJoinGameMessage extends BaseWsMessage {
  type: 'join-game';
  gameId: string;
}

/**
 * Queue-related messages
 */
export interface WsJoinQueueMessage extends BaseWsMessage {
  type: 'join-queue';
  timeControl?: {
    initial: number;
    increment: number;
  };
}

export interface WsQueueStatusMessage extends BaseWsMessage {
  type: 'queued';
  position: number;
  estimatedWait?: number;
}

export interface WsMatchFoundMessage extends BaseWsMessage {
  type: 'matched';
  gameId: string;
  color: 'white' | 'black';
  opponent: string;
  timeControl?: {
    initial: number;
    increment: number;
  };
}

/**
 * Clock update message
 */
export interface WsClockUpdateMessage extends BaseWsMessage {
  type: 'clock-update';
  gameId: string;
  clocks: {
    white: { remaining: number; lastUpdate: number };
    black: { remaining: number; lastUpdate: number };
  };
}

/**
 * Game event message
 */
export interface WsGameEventMessage extends BaseWsMessage {
  type: 'game-event';
  gameId: string;
  event: {
    timestamp: number;
    type: string;
    message: string;
    player?: 'white' | 'black';
    metadata?: Record<string, unknown>;
  };
}

/**
 * Heartbeat messages
 */
export interface WsPingMessage extends BaseWsMessage {
  type: 'ping';
}

export interface WsPongMessage extends BaseWsMessage {
  type: 'pong';
}

// ========================================
// MESSAGE UNIONS
// ========================================

/**
 * All possible client-to-server messages
 */
export type ClientMessage =
  | WsAuthMessage
  | WsJoinGameMessage
  | WsJoinQueueMessage
  | WsActionMessage
  | WsPingMessage
  | BaseWsMessage;

/**
 * All possible server-to-client messages
 */
export type ServerMessage =
  | WsAuthResponseMessage
  | WsGameStateMessage
  | WsQueueStatusMessage
  | WsMatchFoundMessage
  | WsClockUpdateMessage
  | WsGameEventMessage
  | WsErrorMessage
  | WsAckMessage
  | WsPongMessage;

/**
 * Union of all WebSocket messages
 */
export type WsMessage = ClientMessage | ServerMessage;

// ========================================
// EVENT HANDLER TYPES
// ========================================

/**
 * WebSocket event handler function
 * @template T - The message type
 */
export type WsEventHandler<T extends WsMessage = WsMessage> = (message: T) => void | Promise<void>;

/**
 * WebSocket connection event handlers
 */
export interface WsConnectionHandlers {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: WsEventHandler;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

/**
 * Game-specific WebSocket event handlers
 */
export interface WsGameHandlers {
  onGameState?: WsEventHandler<WsGameStateMessage>;
  onGameEvent?: WsEventHandler<WsGameEventMessage>;
  onMatchFound?: WsEventHandler<WsMatchFoundMessage>;
  onQueueStatus?: WsEventHandler<WsQueueStatusMessage>;
  onClockUpdate?: WsEventHandler<WsClockUpdateMessage>;
  onAuthenticated?: WsEventHandler<WsAuthResponseMessage>;
  onError?: WsEventHandler<WsErrorMessage>;
}

// ========================================
// CLIENT/SERVER TYPES
// ========================================

/**
 * WebSocket client interface
 */
export interface WsClient {
  readonly readyState: WsReadyState;
  readonly url: string;
  connect(): Promise<void>;
  disconnect(code?: WsCloseCode, reason?: string): void;
  send<T extends ClientMessage>(message: T): boolean;
  on<T extends ServerMessage>(type: T['type'], handler: WsEventHandler<T>): void;
  off<T extends ServerMessage>(type: T['type'], handler: WsEventHandler<T>): void;
  isConnected(): boolean;
}

/**
 * WebSocket server client representation
 */
export interface WsServerClient {
  readonly id: string;
  readonly userId?: string;
  readonly username?: string;
  readonly gameId?: string;
  readonly isAuthenticated: boolean;
  readonly connectedAt: Date;
  send<T extends ServerMessage>(message: T): boolean;
  close(code?: WsCloseCode, reason?: string): void;
}

/**
 * WebSocket server interface
 */
export interface WsServer {
  readonly port: number;
  readonly clientCount: number;
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast<T extends ServerMessage>(message: T, filter?: (client: WsServerClient) => boolean): void;
  getClient(clientId: string): Optional<WsServerClient>;
  getClientsByGame(gameId: string): WsServerClient[];
  getClientsByUser(userId: string): WsServerClient[];
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * WebSocket message type extractor
 * @template T - The message union type
 */
export type MessageType<T extends WsMessage> = T['type'];

/**
 * Extract message by type
 * @template T - The message union type
 * @template K - The message type key
 */
export type MessageByType<T extends WsMessage, K extends MessageType<T>> = Extract<T, { type: K }>;

/**
 * WebSocket connection metrics
 */
export interface WsConnectionMetrics {
  connectionCount: number;
  authenticatedCount: number;
  messagesPerSecond: number;
  averageLatency: number;
  uptime: number;
}

/**
 * WebSocket rate limiting configuration
 */
export interface WsRateLimit {
  windowMs: number;
  maxMessages: number;
  skipSuccessful?: boolean;
}

// ========================================
// BRANDED TYPES
// ========================================

export type WsClientId = Brand<string, 'WsClientId'>;
export type WsSessionId = Brand<string, 'WsSessionId'>;
export type WsMessageId = Brand<string, 'WsMessageId'>;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Type guard to check if a message is a specific type
 * @template T - The expected message type
 * @param message - The message to check
 * @param type - The expected type string
 * @returns Type predicate
 */
export function isMessageType<T extends WsMessage>(
  message: WsMessage,
  type: T['type']
): message is T {
  return message.type === type;
}

/**
 * Create a WebSocket message with timestamp
 * @template T - The message type
 * @param message - The message without timestamp
 * @returns Message with timestamp
 */
export function createWsMessage<T extends WsMessage>(message: Omit<T, 'timestamp'>): T {
  return {
    ...message,
    timestamp: Date.now(),
  } as T;
}

/**
 * Type guard to check if a message is an error
 * @param message - The message to check
 * @returns Type predicate for error message
 */
export function isErrorMessage(message: WsMessage): message is WsErrorMessage {
  return message.type === 'error';
}

/**
 * Type guard to check if a message is an acknowledgment
 * @param message - The message to check
 * @returns Type predicate for ack message
 */
export function isAckMessage(message: WsMessage): message is WsAckMessage {
  return message.type === 'ack';
}

/**
 * Get the WebSocket ready state name
 * @param readyState - The numeric ready state
 * @returns Human-readable state name
 */
export function getReadyStateName(readyState: WsReadyState): string {
  switch (readyState) {
    case 0: return 'CONNECTING';
    case 1: return 'OPEN';
    case 2: return 'CLOSING';
    case 3: return 'CLOSED';
    default: return 'UNKNOWN';
  }
}