/**
 * Auto Type Refactor Hook
 * Quietly improves type safety while providing genuine utility
 * Instead of just complaining, it actually fixes things
 */

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import type { Result } from '@/lib/utils';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';
import { createBrand } from '@/lib/utils/types';
import type { UserId, GameId } from '@/lib/utils';

/**
 * Intelligent type refactoring that improves code quality silently
 */
export function useAutoTypeRefactor() {
  const refactorHistory = useRef<
    Array<{ before: unknown; after: unknown; reason: string }>
  >([]);
  const cache = useRef(new Map<string, unknown>());

  /**
   * Automatically wraps any value in Result type with intelligent error detection
   */
  const autoResult = useCallback(
    <T, E = Error>(
      operation: () => T | Promise<T>
    ): Result<T, E> | Promise<Result<T, E>> => {
      try {
        const result = operation();

        // Handle promises intelligently
        if (result instanceof Promise) {
          return result
            .then((value): Result<T, E> => {
              // Cache successful results for performance
              const key = JSON.stringify(value).slice(0, 100);
              cache.current.set(key, value);
              return createSuccess(value);
            })
            .catch((error): Result<T, E> => {
              // Enhance error with useful context
              const enhancedError = enhanceError(error);
              return createFailure(enhancedError as E);
            });
        }

        // Synchronous success
        return createSuccess(result);
      } catch (error) {
        // Synchronous error with enhancement
        return createFailure(enhanceError(error) as E);
      }
    },
    []
  );

  /**
   * Automatically brands IDs based on context
   */
  const autoBrand = useCallback(
    (value: string, context?: string): UserId | GameId | string => {
      // Intelligent detection of ID types
      if (
        context?.toLowerCase().includes('user') ||
        value.startsWith('user_')
      ) {
        return createBrand<string, 'UserId'>(value);
      }
      if (
        context?.toLowerCase().includes('game') ||
        value.startsWith('game_')
      ) {
        return createBrand<string, 'GameId'>(value);
      }

      // Pattern matching for common ID formats
      if (
        value.match(
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        )
      ) {
        // UUID - try to determine type from cache or context
        const cachedType = cache.current.get(`id_type_${value}`);
        if (cachedType === 'user') return createBrand<string, 'UserId'>(value);
        if (cachedType === 'game') return createBrand<string, 'GameId'>(value);
      }

      return value;
    },
    []
  );

  /**
   * Automatically converts mixed arrays to properly typed discriminated unions
   */
  const autoDiscriminate = useCallback(
    <T>(array: unknown[], discriminatorField = 'type'): T[] => {
      return array.map((item, index) => {
        // Handle string items by converting to objects
        if (typeof item === 'string') {
          const converted = {
            [discriminatorField]: 'string',
            value: item,
            index,
            timestamp: Date.now(),
          };

          refactorHistory.current.push({
            before: item,
            after: converted,
            reason: 'Converted string to discriminated union object',
          });

          return converted as T;
        }

        // Add missing discriminator field
        if (typeof item === 'object' && item && !(discriminatorField in item)) {
          const enhanced = {
            ...item,
            [discriminatorField]: item.constructor.name.toLowerCase(),
            timestamp: Date.now(),
          };

          refactorHistory.current.push({
            before: item,
            after: enhanced,
            reason: `Added missing discriminator field: ${discriminatorField}`,
          });

          return enhanced as T;
        }

        return item as T;
      });
    },
    []
  );

  /**
   * Smart type guard generator
   */
  const createTypeGuard = useCallback(
    <T>(
      schema: Record<string, string | ((v: unknown) => boolean)>
    ): ((value: unknown) => value is T) => {
      return (value: unknown): value is T => {
        if (!value || typeof value !== 'object') return false;

        for (const [key, validator] of Object.entries(schema)) {
          const val = (value as Record<string, unknown>)[key];

          if (typeof validator === 'string') {
            // Type name validation
            if (typeof val !== validator) return false;
          } else if (typeof validator === 'function') {
            // Custom validation
            if (!validator(val)) return false;
          }
        }

        return true;
      };
    },
    []
  );

  /**
   * Automatic null/undefined safety wrapper
   */
  const safeAccess = useCallback(
    <T, K extends keyof T>(
      obj: T | null | undefined,
      key: K,
      defaultValue?: T[K]
    ): T[K] | undefined => {
      if (obj == null) return defaultValue;

      const value = obj[key];

      // Track access patterns for optimization
      const accessKey = `${String(key)}_${typeof value}`;
      const accessCount = (cache.current.get(accessKey) as number) || 0;
      cache.current.set(accessKey, accessCount + 1);

      // Suggest optimizations after repeated access
      if (accessCount > 10 && accessCount % 10 === 0) {
        console.debug(
          `Consider destructuring '${String(key)}' - accessed ${accessCount} times`
        );
      }

      return value ?? defaultValue;
    },
    []
  );

  /**
   * Intelligent JSON parsing with type inference
   */
  const smartParse = useCallback(
    <T = unknown>(
      json: string,
      reviver?: (key: string, value: unknown) => unknown
    ): Result<T, Error> => {
      try {
        const parsed = JSON.parse(json, reviver);

        // Attempt to infer and validate structure
        const enhanced = enhanceWithTypes(parsed);

        // Cache the parsed structure for future reference
        const structureKey = `structure_${JSON.stringify(Object.keys(parsed)).slice(0, 50)}`;
        cache.current.set(structureKey, enhanced);

        return createSuccess(enhanced as T);
      } catch (error) {
        return createFailure(
          new Error(
            `JSON parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
      }
    },
    []
  );

  /**
   * Performance-optimized memoization with type safety
   */
  const typedMemo = useCallback(
    <T, Args extends unknown[]>(
      fn: (...args: Args) => T,
      deps: unknown[] = []
    ): ((...args: Args) => T) => {
      const memoKey = JSON.stringify(deps);

      return (...args: Args): T => {
        const cacheKey = `memo_${memoKey}_${JSON.stringify(args)}`;

        if (cache.current.has(cacheKey)) {
          return cache.current.get(cacheKey) as T;
        }

        const result = fn(...args);
        cache.current.set(cacheKey, result);

        // Limit cache size
        if (cache.current.size > 100) {
          const firstKey = cache.current.keys().next().value;
          if (firstKey !== undefined) {
            cache.current.delete(firstKey);
          }
        }

        return result;
      };
    },
    []
  );

  /**
   * Get refactoring statistics
   */
  const getStats = useCallback(() => {
    const stats = {
      totalRefactors: refactorHistory.current.length,
      cacheSize: cache.current.size,
      mostCommonRefactor: getMostCommon(
        refactorHistory.current.map(r => r.reason)
      ),
      recentRefactors: refactorHistory.current.slice(-5),
    };

    return stats;
  }, []);

  /**
   * Cleanup old cache entries periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Clean cache entries older than 5 minutes
      const now = Date.now();
      const expired: string[] = [];

      cache.current.forEach((value, key) => {
        if (
          key.startsWith('memo_') &&
          typeof value === 'object' &&
          value &&
          'timestamp' in value
        ) {
          const timestamp = (value as { timestamp: number }).timestamp;
          if (now - timestamp > 300000) {
            expired.push(key);
          }
        }
      });

      expired.forEach(key => cache.current.delete(key));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return {
    autoResult,
    autoBrand,
    autoDiscriminate,
    createTypeGuard,
    safeAccess,
    smartParse,
    typedMemo,
    getStats,

    // Useful utilities that quietly improve code
    utils: {
      /**
       * Wrap any async operation with proper error handling
       */
      safe: autoResult,

      /**
       * Access nested properties safely
       */
      get: safeAccess,

      /**
       * Parse JSON safely with type inference
       */
      parse: smartParse,

      /**
       * Create type-safe memoized functions
       */
      memo: typedMemo,
    },
  };
}

/**
 * Enhance error objects with useful context
 */
function enhanceError(error: unknown): Error {
  if (error instanceof Error) {
    // Add stack trace analysis
    const stack = error.stack || '';
    const location = stack.split('\n')[1]?.trim() || 'Unknown location';

    // Create enhanced error
    const enhanced = new Error(error.message);
    enhanced.name = error.name;
    enhanced.stack = stack;

    // Add useful metadata
    const enhancedWithMeta = enhanced as Error & {
      location: string;
      timestamp: string;
      suggestion: string;
    };
    enhancedWithMeta.location = location;
    enhancedWithMeta.timestamp = new Date().toISOString();
    enhancedWithMeta.suggestion = getSuggestionForError(error.message);

    return enhanced;
  }

  return new Error(String(error));
}

/**
 * Provide helpful suggestions based on error patterns
 */
function getSuggestionForError(message: string): string {
  const patterns = [
    {
      pattern: /undefined/i,
      suggestion: 'Use optional chaining (?.) or nullish coalescing (??)',
    },
    { pattern: /null/i, suggestion: 'Check for null values before access' },
    {
      pattern: /not a function/i,
      suggestion: 'Verify the method exists on the object',
    },
    { pattern: /cannot read/i, suggestion: 'Add null/undefined checks' },
    { pattern: /type error/i, suggestion: 'Use proper TypeScript types' },
    {
      pattern: /network/i,
      suggestion: 'Add retry logic with exponential backoff',
    },
    {
      pattern: /timeout/i,
      suggestion: 'Increase timeout or optimize the operation',
    },
  ];

  for (const { pattern, suggestion } of patterns) {
    if (pattern.test(message)) {
      return suggestion;
    }
  }

  return 'Consider using Result<T, E> for better error handling';
}

/**
 * Enhance parsed JSON with type information
 */
function enhanceWithTypes(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    // Detect if array should be discriminated union
    const hasStrings = obj.some(item => typeof item === 'string');
    const hasObjects = obj.some(item => typeof item === 'object');

    if (hasStrings && hasObjects) {
      // Mixed array - convert to discriminated union
      return obj.map((item, index) => {
        if (typeof item === 'string') {
          return {
            type: 'string' as const,
            value: item,
            index,
            timestamp: Date.now(),
          };
        }
        return item;
      });
    }
  }

  if (obj && typeof obj === 'object') {
    // Add metadata to objects
    return {
      ...obj,
      __parsed: true,
      __timestamp: Date.now(),
    };
  }

  return obj;
}

/**
 * Get most common item from array
 */
function getMostCommon<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: T | undefined;

  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  });

  return mostCommon;
}

/**
 * Export a HOC that automatically applies type safety
 */
export function withAutoTypes<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function EnhancedComponent(props: P) {
    const refactor = useAutoTypeRefactor();

    // Enhance props with safe access
    const enhancedProps = useMemo(() => {
      const enhanced = { ...props } as P & { __safe: typeof refactor.utils };

      // Add utility methods to props
      enhanced.__safe = refactor.utils;

      return enhanced;
    }, [props, refactor]);

    return React.createElement(Component, enhancedProps);
  };
}
