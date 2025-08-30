/**
 * Bridge utilities for converting between our internal types and ban-chess.ts types
 * Maintains type safety while providing seamless interoperability
 */

import type { Move, Ban, Action, SerializedAction } from '@/lib/game-types';
import type { Square } from '@/lib/utils/types';
import type {
  Square as BanChessSquare,
  Move as BanChessMove,
  Ban as BanChessBan,
  Action as BanChessAction,
  SerializedAction as BanChessSerializedAction,
} from 'ban-chess.ts';
import {
  isValidChessSquare,
  isBanChessSquare,
  isValidBCNFormat,
  isBanChessMove,
  isBanChessBan,
  isBanChessAction,
  isMoveAction,
  isBanAction,
} from './type-guards';
import { createBrand } from './types';

// ========================================
// SQUARE CONVERSION UTILITIES
// ========================================

/**
 * Convert our branded Square to ban-chess.ts Square
 * Both are essentially the same at runtime (chess square notation)
 */
export function toBanChessSquare(square: Square): BanChessSquare {
  if (!isValidChessSquare(square)) {
    throw new Error(`Invalid square format: ${square}`);
  }
  return square as BanChessSquare;
}

/**
 * Convert ban-chess.ts Square to our branded Square
 */
export function fromBanChessSquare(square: BanChessSquare): Square {
  if (!isBanChessSquare(square)) {
    throw new Error(`Invalid ban-chess square: ${square}`);
  }
  return createBrand<string, 'ChessSquare'>(square);
}

/**
 * Safely convert string to our Square type with validation
 */
export function toSquare(value: string): Square {
  if (!isValidChessSquare(value)) {
    throw new Error(`Invalid chess square notation: ${value}`);
  }
  return createBrand<string, 'ChessSquare'>(value);
}

// ========================================
// MOVE CONVERSION UTILITIES
// ========================================

/**
 * Convert our internal Move to ban-chess.ts Move
 */
export function toBanChessMove(move: Move): BanChessMove {
  return {
    from: toBanChessSquare(move.from),
    to: toBanChessSquare(move.to),
    promotion: move.promotion,
  };
}

/**
 * Convert ban-chess.ts Move to our internal Move
 */
export function fromBanChessMove(move: BanChessMove): Move {
  if (!isBanChessMove(move)) {
    throw new Error(`Invalid ban-chess move: ${JSON.stringify(move)}`);
  }

  return {
    from: fromBanChessSquare(move.from),
    to: fromBanChessSquare(move.to),
    promotion: move.promotion,
  };
}

// ========================================
// BAN CONVERSION UTILITIES
// ========================================

/**
 * Convert our internal Ban to ban-chess.ts Ban
 */
export function toBanChessBan(ban: Ban): BanChessBan {
  return {
    from: toBanChessSquare(ban.from),
    to: toBanChessSquare(ban.to),
  };
}

/**
 * Convert ban-chess.ts Ban to our internal Ban
 */
export function fromBanChessBan(ban: BanChessBan): Ban {
  if (!isBanChessBan(ban)) {
    throw new Error(`Invalid ban-chess ban: ${JSON.stringify(ban)}`);
  }

  return {
    from: fromBanChessSquare(ban.from),
    to: fromBanChessSquare(ban.to),
  };
}

// ========================================
// ACTION CONVERSION UTILITIES
// ========================================

/**
 * Convert our internal Action to ban-chess.ts Action
 */
export function toBanChessAction(action: Action): BanChessAction {
  if ('move' in action) {
    return { move: toBanChessMove(action.move) };
  } else if ('ban' in action) {
    return { ban: toBanChessBan(action.ban) };
  } else {
    throw new Error(`Invalid action format: ${JSON.stringify(action)}`);
  }
}

/**
 * Convert ban-chess.ts Action to our internal Action
 */
export function fromBanChessAction(action: BanChessAction): Action {
  if (!isBanChessAction(action)) {
    throw new Error(`Invalid ban-chess action: ${JSON.stringify(action)}`);
  }

  if (isMoveAction(action)) {
    return { move: fromBanChessMove(action.move) };
  } else if (isBanAction(action)) {
    return { ban: fromBanChessBan(action.ban) };
  } else {
    throw new Error(`Unrecognized action type: ${JSON.stringify(action)}`);
  }
}

// ========================================
// SERIALIZED ACTION CONVERSION
// ========================================

/**
 * Convert ban-chess.ts SerializedAction (plain string) to our branded SerializedAction
 * Validates the format before branding
 */
export function fromBanChessSerializedAction(
  serialized: BanChessSerializedAction
): SerializedAction {
  if (!isValidBCNFormat(serialized)) {
    throw new Error(`Invalid BCN format: ${serialized}`);
  }
  return createBrand<string, 'BCN'>(serialized);
}

/**
 * Convert our branded SerializedAction to ban-chess.ts SerializedAction (plain string)
 */
export function toBanChessSerializedAction(
  serialized: SerializedAction
): BanChessSerializedAction {
  // Our SerializedAction is already a string at runtime, just remove the brand
  return serialized as string;
}

/**
 * Safely create a SerializedAction from a string with validation
 */
export function createSerializedAction(value: string): SerializedAction {
  if (!isValidBCNFormat(value)) {
    throw new Error(`Invalid BCN format: ${value}`);
  }
  return createBrand<string, 'BCN'>(value);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Extract move from ban-chess.ts Action if it's a move action
 */
export function extractBanChessMove(
  action: BanChessAction
): BanChessMove | null {
  return isMoveAction(action) ? action.move : null;
}

/**
 * Extract ban from ban-chess.ts Action if it's a ban action
 */
export function extractBanChessBan(action: BanChessAction): BanChessBan | null {
  return isBanAction(action) ? action.ban : null;
}

/**
 * Check if two squares are the same (works with mixed types)
 */
export function squaresEqual(
  square1: Square | BanChessSquare,
  square2: Square | BanChessSquare
): boolean {
  return square1 === square2;
}

/**
 * Validate and convert an array of strings to SerializedAction array
 */
export function validateSerializedActions(
  values: string[]
): SerializedAction[] {
  const results: SerializedAction[] = [];

  for (const value of values) {
    if (!isValidBCNFormat(value)) {
      throw new Error(`Invalid BCN format in array: ${value}`);
    }
    results.push(createBrand<string, 'BCN'>(value));
  }

  return results;
}

/**
 * Convert array of SerializedActions to plain strings for ban-chess.ts
 */
export function serializationActionsToStrings(
  actions: SerializedAction[]
): string[] {
  return actions.map(action => action as string);
}
