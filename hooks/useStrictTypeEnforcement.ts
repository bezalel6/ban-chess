/**
 * The Nuclear Option: A hook that makes it IMPOSSIBLE to ignore type safety
 * This will actively break your code if you try to bypass the type system
 */

import { useEffect, useCallback, useRef } from 'react';
import type { Result } from '@/lib/utils';
import { createSuccess, createFailure } from '@/lib/utils/result-helpers';

// Global type safety violator registry (name and shame!)
const HALL_OF_SHAME = new Set<string>();

/**
 * The most passive-aggressive type enforcement hook ever created
 * It will literally make your development experience miserable if you ignore types
 */
export function useStrictTypeEnforcement() {
  const renderCount = useRef(0);
  const violationStreak = useRef(0);

  useEffect(() => {
    renderCount.current++;

    // Detect development environment
    if (process.env.NODE_ENV !== 'development') return;

    // Create a Proxy on the global console to intercept all logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console methods to detect type violations
    console.log = new Proxy(originalLog, {
      apply(target, thisArg, args) {
        const message = args.join(' ');

        // Check for type violation patterns in console output
        if (detectTypeViolation(message)) {
          violationStreak.current++;

          // Get increasingly annoying with each violation
          if (violationStreak.current > 5) {
            // Start adding delays to console logs as punishment
            const delay = Math.min(violationStreak.current * 100, 2000);
            setTimeout(() => {
              target.apply(thisArg, [
                '⏱️ Your console.log was delayed by',
                delay,
                'ms due to type violations',
              ]);
            }, delay);
          }

          // Add shameful prefix to their logs
          args.unshift('🚨 [TYPE VIOLATOR] ');
        }

        return target.apply(thisArg, args);
      },
    });

    // Install global error handler that blames type violations
    window.addEventListener('error', event => {
      if (
        event.error?.message?.includes('undefined') ||
        event.error?.message?.includes('null') ||
        event.error?.message?.includes('is not a function')
      ) {
        console.error(`
╔═══════════════════════════════════════════════════════╗
║                  🔥 RUNTIME ERROR 🔥                  ║
║                                                       ║
║  This error likely occurred because you:             ║
║  1. Used 'any' instead of proper types               ║
║  2. Ignored TypeScript warnings                      ║
║  3. Used type assertions (as any)                    ║
║  4. Didn't use Result<T, E> for error handling       ║
║                                                       ║
║  Error: ${event.error?.message?.slice(0, 40)}...     ║
║                                                       ║
║  Fix your types and this won't happen!               ║
╚═══════════════════════════════════════════════════════╝
        `);

        // Add to hall of shame
        const stackLine =
          event.error?.stack?.split('\n')[1] || 'Unknown location';
        HALL_OF_SHAME.add(stackLine);

        // Randomly show the hall of shame (10% chance)
        if (Math.random() < 0.1) {
          displayHallOfShame();
        }
      }
    });

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  /**
   * Force type-safe operations
   */
  const enforceResult = useCallback(
    <T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> => {
      return promise
        .then((value): Result<T, E> => createSuccess(value))
        .catch((error): Result<T, E> => {
          // Shame them for not handling errors properly
          console.warn(`
⚠️ Unhandled promise rejection detected!
Use Result<T, E> pattern instead of raw promises.
Error will be wrapped in Result type for you (this time).
        `);
          return createFailure(error as E);
        });
    },
    []
  );

  /**
   * Create a trapped proxy that enforces type safety
   */
  const createTypeSafeProxy = useCallback(
    <T extends object>(obj: T, typeName: string): T => {
      return new Proxy(obj, {
        get(target, prop) {
          const value = target[prop as keyof T];

          // Detect access to undefined properties
          if (value === undefined && !(prop in target)) {
            console.error(`
❌ Accessing undefined property '${String(prop)}' on ${typeName}!
This would have been caught at compile time with proper types.
Available properties: ${Object.keys(target).join(', ')}
          `);
            violationStreak.current++;
          }

          return value;
        },

        set(target, prop, value) {
          // Detect setting properties to 'any' type values
          if (value && typeof value === 'object' && !value.constructor) {
            console.warn(`
⚠️ Setting property '${String(prop)}' to an untyped object!
Consider defining an interface for this object.
          `);
          }

          target[prop as keyof T] = value;
          return true;
        },
      });
    },
    []
  );

  /**
   * The nuclear option: crash on type violations
   */
  const enforceOrDie = useCallback(
    <T>(value: T, validator: (v: T) => boolean, typeName: string): T => {
      if (!validator(value)) {
        const error = new Error(`
TYPE SAFETY VIOLATION: Value does not match expected type '${typeName}'
Value: ${JSON.stringify(value, null, 2)}

This is what happens when you ignore TypeScript.
Use proper types and type guards!
      `);

        // Make the error extra annoying
        error.name = '💀 TYPE_SAFETY_VIOLATION 💀';

        // Log the stack trace in red
        console.error('%c' + error.stack, 'color: red; font-weight: bold;');

        // Throw after a delay to let them see the error
        setTimeout(() => {
          throw error;
        }, 100);
      }

      return value;
    },
    []
  );

  return {
    enforceResult,
    createTypeSafeProxy,
    enforceOrDie,
    violationCount: violationStreak.current,

    /**
     * Reset violations (requires penance)
     */
    resetViolations: () => {
      const penance = prompt(
        `You have ${violationStreak.current} type violations.\n` +
          'To reset, type exactly:\n' +
          '"I solemnly swear to use Result<T, E> and branded types"'
      );

      if (
        penance === 'I solemnly swear to use Result<T, E> and branded types'
      ) {
        violationStreak.current = 0;
        console.log(
          '✅ Type violations reset. Please use proper types from now on!'
        );
      } else {
        console.error('❌ Incorrect penance. Violations remain!');
        violationStreak.current += 5; // Penalty for failed penance
      }
    },
  };
}

/**
 * Detect type violations in strings
 */
function detectTypeViolation(str: string): boolean {
  const violations = [
    'as any',
    'as unknown',
    '@ts-ignore',
    '@ts-nocheck',
    ': any',
    'catch (e)',
    'catch (err)',
    'JSON.parse(',
    'Object.keys(', // Often used unsafely
    '.toString()', // Often used without null checks
  ];

  return violations.some(v => str.includes(v));
}

/**
 * Display the hall of shame
 */
function displayHallOfShame() {
  if (HALL_OF_SHAME.size === 0) return;

  console.group('🏆 TYPE VIOLATION HALL OF SHAME 🏆');
  console.log(
    'The following locations have caused runtime errors due to poor typing:'
  );

  Array.from(HALL_OF_SHAME).forEach((location, index) => {
    console.log(`${index + 1}. ${location}`);
  });

  console.log(
    '\nThese errors could have been prevented with proper TypeScript usage!'
  );
  console.groupEnd();
}

/**
 * Auto-enforcer that runs on import
 * This is the truly evil part - it runs automatically!
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Monkey-patch fetch to enforce Result pattern
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.warn('📡 fetch() called without Result<T, E> wrapper!');
    console.warn('Consider using a type-safe fetch wrapper.');
    return originalFetch(...args);
  };

  // Monkey-patch JSON.parse to enforce type safety
  const originalParse = JSON.parse;
  JSON.parse = (
    text: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown
  ) => {
    const result = originalParse(text, reviver);

    // Warn about untyped JSON.parse
    console.warn(`
⚠️ JSON.parse() called without type assertion!
Parsed value type: ${typeof result}
Consider using: JSON.parse(text) as YourInterfaceType
Or better: Use a Result<T, E> wrapper for safe parsing
    `);

    return result;
  };

  // Add annoying reminder every 5 minutes
  setInterval(() => {
    if (HALL_OF_SHAME.size > 0 || Math.random() < 0.3) {
      const tips = [
        '💡 Reminder: Result<T, E> prevents runtime errors!',
        '💡 Tip: Branded types prevent ID mix-ups!',
        '💡 Fact: Every "any" is a future bug!',
        '💡 PSA: Type guards are your friends!',
        '💡 FYI: Discriminated unions make impossible states impossible!',
      ];

      console.log(
        '%c' + tips[Math.floor(Math.random() * tips.length)],
        'background: #f0f0f0; color: #333; padding: 5px 10px; border-radius: 3px;'
      );
    }
  }, 300000); // Every 5 minutes

  // The ultimate annoyance: Style the console
  console.log(
    '%c⚠️ TYPE ENFORCEMENT ACTIVE ⚠️',
    'font-size: 20px; font-weight: bold; color: red; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);'
  );
  console.log(
    '%cYour code is being monitored for type safety violations.',
    'font-size: 12px; color: #666;'
  );
  console.log(
    '%cUse Result<T, E>, branded types, and discriminated unions or suffer the consequences!',
    'font-size: 12px; color: #666; font-style: italic;'
  );
}

export default useStrictTypeEnforcement;
