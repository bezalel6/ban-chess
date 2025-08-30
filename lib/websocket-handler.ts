/**
 * WebSocket message handler with type-safe message parsing and validation
 */

import type { SimpleServerMsg, SimpleClientMsg } from '@/lib/game-types';
import type { Result } from '@/lib/utils';
import { isSuccess } from '@/lib/utils/type-guards';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';

/**
 * Validates a server message
 */
function validateServerMessage(data: unknown): Result<SimpleServerMsg, Error> {
  if (!data || typeof data !== 'object') {
    return createFailure(new Error('Invalid server message format'));
  }

  const msg = data as Record<string, unknown>;
  if (!msg.type || typeof msg.type !== 'string') {
    return createFailure(new Error('Server message missing type field'));
  }

  return createSuccess(msg as SimpleServerMsg);
}

/**
 * Validates a client message
 */
function validateClientMessage(data: unknown): Result<SimpleClientMsg, Error> {
  if (!data || typeof data !== 'object') {
    return createFailure(new Error('Invalid client message format'));
  }

  const msg = data as Record<string, unknown>;
  if (!msg.type || typeof msg.type !== 'string') {
    return createFailure(new Error('Client message missing type field'));
  }

  return createSuccess(msg as SimpleClientMsg);
}

/**
 * Parses and validates incoming WebSocket messages
 */
export function parseWebSocketMessage<
  T extends SimpleServerMsg | SimpleClientMsg,
>(data: unknown, messageType: 'server' | 'client'): Result<T, Error> {
  try {
    // Handle string data
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);

      if (messageType === 'server') {
        return validateServerMessage(parsed) as Result<T, Error>;
      } else {
        return validateClientMessage(parsed) as Result<T, Error>;
      }
    }

    // Handle MessageEvent
    if (data && typeof data === 'object' && 'data' in data) {
      const messageEvent = data as MessageEvent;
      return parseWebSocketMessage(messageEvent.data, messageType);
    }

    // Handle direct object
    if (messageType === 'server') {
      return validateServerMessage(data) as Result<T, Error>;
    } else {
      return validateClientMessage(data) as Result<T, Error>;
    }
  } catch (error) {
    return createFailure(
      error instanceof Error
        ? error
        : new Error('Failed to parse WebSocket message')
    );
  }
}

/**
 * Creates a type-safe WebSocket message
 */
export function createWebSocketMessage<
  T extends SimpleServerMsg | SimpleClientMsg,
>(type: T['type'], payload: Omit<T, 'type'>): string {
  const message = { type, ...payload };
  return JSON.stringify(message);
}

/**
 * Type guard for server messages
 */
export function isServerMessage(msg: unknown): msg is SimpleServerMsg {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;

  const serverTypes = [
    'state',
    'joined',
    'authenticated',
    'queued',
    'matched',
    'error',
    'solo-game-created',
    'clock-update',
    'timeout',
    'game-event',
    'pong',
  ];

  return (
    'type' in m && typeof m.type === 'string' && serverTypes.includes(m.type)
  );
}

/**
 * Type guard for client messages
 */
export function isClientMessage(msg: unknown): msg is SimpleClientMsg {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;

  const clientTypes = [
    'authenticate',
    'join-game',
    'join-queue',
    'leave-queue',
    'create-solo-game',
    'action',
    'give-time',
    'ping',
  ];

  return (
    'type' in m && typeof m.type === 'string' && clientTypes.includes(m.type)
  );
}

/**
 * Message handler factory for type-safe message processing
 */
export class WebSocketMessageHandler<
  T extends SimpleServerMsg | SimpleClientMsg,
> {
  private handlers = new Map<T['type'], (msg: T) => void | Promise<void>>();

  /**
   * Register a handler for a specific message type
   */
  on<K extends T['type']>(
    type: K,
    handler: (msg: Extract<T, { type: K }>) => void | Promise<void>
  ): this {
    this.handlers.set(type, handler as (msg: T) => void | Promise<void>);
    return this;
  }

  /**
   * Process an incoming message
   */
  async handle(
    data: unknown,
    messageType: 'server' | 'client'
  ): Promise<Result<void, Error>> {
    const parsed = parseWebSocketMessage<T>(data, messageType);

    if (!isSuccess(parsed)) {
      return parsed;
    }

    const message = parsed.data;
    const handler = this.handlers.get(message.type);

    if (!handler) {
      return createFailure(
        new Error(`No handler registered for message type: ${message.type}`)
      );
    }

    try {
      await handler(message);
      return createSuccess(undefined);
    } catch (error) {
      return createFailure(
        error instanceof Error ? error : new Error('Handler failed')
      );
    }
  }
}

/**
 * Create a server message handler
 */
export function createServerMessageHandler() {
  return new WebSocketMessageHandler<SimpleServerMsg>();
}

/**
 * Create a client message handler
 */
export function createClientMessageHandler() {
  return new WebSocketMessageHandler<SimpleClientMsg>();
}
