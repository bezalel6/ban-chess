/**
 * Result pattern utilities for consistent error handling
 * Provides helper functions for the Result<T, E> monad pattern
 */

import type { Result, Success, Failure, AsyncResult } from './types';

// ========================================
// RESULT CREATION UTILITIES
// ========================================

/**
 * Create a successful result
 */
export function createSuccess<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a failure result
 */
export function createFailure<E>(error: E): Failure<E> {
  return {
    success: false,
    error,
  };
}

/**
 * Create a result from a value or error
 */
export function createResult<T, E>(data?: T, error?: E): Result<T, E> {
  if (error !== undefined) {
    return createFailure(error);
  }
  if (data !== undefined) {
    return createSuccess(data);
  }
  throw new Error('Either data or error must be provided');
}

// ========================================
// RESULT TRANSFORMATION UTILITIES
// ========================================

/**
 * Map a successful result to a new type
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => U
): Result<U, E> {
  return result.success ? createSuccess(mapper(result.data)) : result;
}

/**
 * Map a failure result to a new error type
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => F
): Result<T, F> {
  return result.success ? result : createFailure(mapper(result.error));
}

/**
 * Chain results together (flatMap for Results)
 */
export function chainResult<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => Result<U, E>
): Result<U, E> {
  return result.success ? mapper(result.data) : result;
}

// ========================================
// RESULT EXTRACTION UTILITIES
// ========================================

/**
 * Extract the value from a result, throw if failure
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw new Error(`Result unwrap failed: ${String(result.error)}`);
}

/**
 * Extract the value from a result, return default if failure
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

/**
 * Extract the value from a result, compute default if failure
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  defaultFn: (error: E) => T
): T {
  return result.success ? result.data : defaultFn(result.error);
}

// ========================================
// ASYNC RESULT UTILITIES
// ========================================

/**
 * Convert a Promise to an AsyncResult
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): AsyncResult<T, E> {
  try {
    const data = await promise;
    return createSuccess(data);
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : (error as E);
    return createFailure(mappedError);
  }
}

/**
 * Convert an AsyncResult back to a Promise (throws on failure)
 */
export async function toPromise<T, E>(
  asyncResult: AsyncResult<T, E>
): Promise<T> {
  const result = await asyncResult;
  return unwrapResult(result);
}

/**
 * Map over an AsyncResult
 */
export async function mapAsync<T, U, E>(
  asyncResult: AsyncResult<T, E>,
  mapper: (value: T) => U | Promise<U>
): AsyncResult<U, E> {
  const result = await asyncResult;
  if (result.success) {
    const mapped = await mapper(result.data);
    return createSuccess(mapped);
  }
  return result;
}

/**
 * Chain AsyncResults together
 */
export async function chainAsync<T, U, E>(
  asyncResult: AsyncResult<T, E>,
  mapper: (value: T) => AsyncResult<U, E>
): AsyncResult<U, E> {
  const result = await asyncResult;
  return result.success ? mapper(result.data) : result;
}

// ========================================
// RESULT COMBINATION UTILITIES
// ========================================

/**
 * Combine multiple results into a single result with an array of values
 * If any result is a failure, return the first failure
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (result.success) {
      values.push(result.data);
    } else {
      return result;
    }
  }

  return createSuccess(values);
}

/**
 * Convert legacy {ok, value, error} pattern to Result pattern
 */
export function fromLegacyResult<T, E>(legacy: {
  ok: boolean;
  value?: T;
  error?: E;
}): Result<T, E> {
  return legacy.ok && legacy.value !== undefined
    ? createSuccess(legacy.value)
    : createFailure(legacy.error as E);
}

/**
 * Convert Result pattern to legacy {ok, value, error} pattern
 */
export function toLegacyResult<T, E>(
  result: Result<T, E>
): {
  ok: boolean;
  value?: T;
  error?: E;
} {
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error };
}
