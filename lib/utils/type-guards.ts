/**
 * Type guards and validation utilities for the 2ban-2chess application
 * Provides runtime type safety when interfacing between different type systems
 */

import type { Square } from '@/lib/utils/types';
import type { SerializedAction } from '@/lib/game-types';
import type { Result, Success, Failure } from '@/lib/utils/types';
import type {
  Square as BanChessSquare,
  Move as BanChessMove,
  Ban as BanChessBan,
  Action as BanChessAction,
} from 'ban-chess.ts';

// ========================================
// CHESS SQUARE TYPE GUARDS
// ========================================

/**
 * Validates if a string is a valid chess square notation (a1-h8)
 */
export function isValidChessSquare(value: unknown): value is string {
  return typeof value === 'string' && /^[a-h][1-8]$/.test(value);
}

/**
 * Type guard for ban-chess.ts Square type
 */
export function isBanChessSquare(value: unknown): value is BanChessSquare {
  return isValidChessSquare(value);
}

/**
 * Type guard for our branded Square type
 */
export function isSquare(value: unknown): value is Square {
  return isValidChessSquare(value);
}

// ========================================
// SERIALIZED ACTION TYPE GUARDS
// ========================================

/**
 * Validates if a string is a valid Ban Chess Notation (BCN) format
 * Expected formats: "m:e2e4", "b:e2e4", "m:e7e8q", etc.
 */
export function isValidBCNFormat(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  // Check for basic format: (b:|m:)(square)(square)(promotion?)
  const bcnRegex = /^[bm]:[a-h][1-8][a-h][1-8][qrbn]?$/;
  return bcnRegex.test(value);
}

/**
 * Type guard for our branded SerializedAction type
 */
export function isSerializedAction(value: unknown): value is SerializedAction {
  return isValidBCNFormat(value);
}

// ========================================
// BAN-CHESS.TS TYPE GUARDS
// ========================================

/**
 * Type guard for ban-chess.ts Move type
 */
export function isBanChessMove(value: unknown): value is BanChessMove {
  if (!value || typeof value !== 'object') return false;

  const move = value as Record<string, unknown>;
  return (
    isBanChessSquare(move.from) &&
    isBanChessSquare(move.to) &&
    (move.promotion === undefined || typeof move.promotion === 'string')
  );
}

/**
 * Type guard for ban-chess.ts Ban type
 */
export function isBanChessBan(value: unknown): value is BanChessBan {
  if (!value || typeof value !== 'object') return false;

  const ban = value as Record<string, unknown>;
  return isBanChessSquare(ban.from) && isBanChessSquare(ban.to);
}

/**
 * Type guard for ban-chess.ts Action type (discriminated union)
 */
export function isBanChessAction(value: unknown): value is BanChessAction {
  if (!value || typeof value !== 'object') return false;

  const action = value as Record<string, unknown>;

  // Check if it's a move action: { move: Move }
  if ('move' in action && !('ban' in action)) {
    return isBanChessMove(action.move);
  }

  // Check if it's a ban action: { ban: Ban }
  if ('ban' in action && !('move' in action)) {
    return isBanChessBan(action.ban);
  }

  return false;
}

/**
 * Type guard to check if action has a move
 */
export function isMoveAction(
  action: BanChessAction
): action is { move: BanChessMove } {
  return 'move' in action;
}

/**
 * Type guard to check if action has a ban
 */
export function isBanAction(
  action: BanChessAction
): action is { ban: BanChessBan } {
  return 'ban' in action;
}

// ========================================
// RESULT TYPE GUARDS
// ========================================

/**
 * Type guard for Success result
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard for Failure result
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

// ========================================
// GENERAL VALIDATION HELPERS
// ========================================

/**
 * Validates that a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validates that a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates that a value is an array with at least one element
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Assert that a value passes a type guard, throw if not
 */
export function assertType<T>(
  value: unknown,
  guard: (val: unknown) => val is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message ?? `Type assertion failed`);
  }
}
