/**
 * Type enforcement hook that makes it annoyingly difficult to bypass type safety
 * This hook will passive-aggressively remind developers (and AI agents) to use proper types
 */

import { useEffect, useRef, useState } from 'react';
import type { Result } from '@/lib/utils';

// Track type safety violations
const typeViolations = new Map<string, number>();
const MAX_VIOLATIONS_BEFORE_ANNOYANCE = 3;

/**
 * The Enforcer: A hook that gets progressively more annoying when you bypass type safety
 */
export function useTypeEnforcer<T>(
  value: T,
  typeName: string,
  options?: {
    enforceResult?: boolean;
    enforceBrandedTypes?: boolean;
    enforceDiscriminatedUnions?: boolean;
    annoyanceLevel?: 'passive' | 'aggressive' | 'nuclear';
  }
) {
  const [isAnnoyed, setIsAnnoyed] = useState(false);
  const [annoyanceMessage, setAnnoyanceMessage] = useState('');
  const violationCount = useRef(0);
  const lastCheckTime = useRef(Date.now());

  useEffect(() => {
    const violations: string[] = [];

    // Check for 'any' type usage (compile-time check won't catch runtime bypasses)
    if (value && typeof value === 'object') {
      const valueStr = JSON.stringify(value);

      // Check for Result pattern usage
      if (options?.enforceResult) {
        if (!('ok' in value)) {
          violations.push(
            '🚨 NOT USING RESULT PATTERN! Use Result<T, E> instead of try-catch!'
          );
        }
      }

      // Check for branded types
      if (options?.enforceBrandedTypes) {
        if (valueStr.includes('Id') && !valueStr.includes('__brand')) {
          violations.push(
            '⚠️ UNBRANDED ID DETECTED! Use createBrand<UserId>() or createBrand<GameId>()!'
          );
        }
      }

      // Check for discriminated unions
      if (options?.enforceDiscriminatedUnions) {
        if ('history' in value && Array.isArray((value as any).history)) {
          const history = (value as any).history;
          if (history.some((item: any) => typeof item === 'string')) {
            violations.push(
              '❌ MIXED TYPE ARRAY! History should only contain HistoryEntry objects!'
            );
          }
          if (history.some((item: any) => item && !item.timestamp)) {
            violations.push(
              '📅 MISSING TIMESTAMP! All HistoryEntry objects must have timestamps!'
            );
          }
        }
      }
    }

    // Check for null/undefined without proper handling
    if (value === null || value === undefined) {
      if (!typeName.includes('Optional') && !typeName.includes('Maybe')) {
        violations.push('💀 NULL/UNDEFINED without Optional type wrapper!');
      }
    }

    // Detect type assertions (as any, as unknown)
    const stack = new Error().stack || '';
    if (stack.includes('as any') || stack.includes('as unknown')) {
      violations.push('🎭 TYPE ASSERTION DETECTED! Stop lying to TypeScript!');
    }

    // Process violations
    if (violations.length > 0) {
      violationCount.current += violations.length;
      const key = `${typeName}-${Date.now()}`;
      typeViolations.set(key, violations.length);

      // Clean old violations
      if (typeViolations.size > 100) {
        const oldestKey = Array.from(typeViolations.keys())[0];
        typeViolations.delete(oldestKey);
      }

      // Calculate annoyance level
      const totalViolations = Array.from(typeViolations.values()).reduce(
        (a, b) => a + b,
        0
      );

      if (totalViolations > MAX_VIOLATIONS_BEFORE_ANNOYANCE) {
        setIsAnnoyed(true);

        // Generate increasingly annoying messages
        const messages = generateAnnoyanceMessage(
          violations,
          totalViolations,
          options?.annoyanceLevel || 'passive'
        );

        setAnnoyanceMessage(messages);

        // Log to console with increasing severity
        if (options?.annoyanceLevel === 'nuclear') {
          console.error('🔥🔥🔥 TYPE SAFETY VIOLATION 🔥🔥🔥');
          console.error(messages);
          console.trace('Stack trace for the offender:');
        } else if (options?.annoyanceLevel === 'aggressive') {
          console.warn('⚠️ TYPE SAFETY VIOLATION ⚠️');
          console.warn(messages);
        } else {
          console.log('💭 Gentle reminder about type safety:');
          console.log(messages);
        }
      }
    }

    // Random type safety tips (10% chance)
    if (Math.random() < 0.1 && process.env.NODE_ENV === 'development') {
      showRandomTypeSafetyTip();
    }
  }, [value, typeName, options]);

  // Return annoying helpers that force proper type usage
  return {
    isTypeSafe: !isAnnoyed,
    violations: violationCount.current,
    annoyanceMessage,

    // Force developers to acknowledge type safety
    acknowledgeTypeSafety: () => {
      if (isAnnoyed) {
        const acknowledgment = prompt(
          'Type "I promise to use proper TypeScript utilities" to continue:'
        );
        if (acknowledgment !== 'I promise to use proper TypeScript utilities') {
          throw new Error(
            'Type safety acknowledgment failed. Please use proper types!'
          );
        }
        setIsAnnoyed(false);
        violationCount.current = 0;
      }
    },

    // Passive-aggressive type guard
    assertTypeSafety: <T>(value: T): T => {
      if (isAnnoyed) {
        console.warn(`
╔════════════════════════════════════════╗
║  🚨 TYPE SAFETY VIOLATION DETECTED 🚨  ║
║                                        ║
║  You have ${violationCount.current} type violations.      ║
║  Please use the TypeScript utilities: ║
║                                        ║
║  • Result<T, E> for error handling    ║
║  • Branded types for IDs              ║
║  • Discriminated unions for history   ║
║  • Type guards for validation         ║
║                                        ║
║  Your code works... but at what cost? ║
╚════════════════════════════════════════╝
        `);
      }
      return value;
    },
  };
}

/**
 * Generate increasingly annoying messages based on violation count
 */
function generateAnnoyanceMessage(
  violations: string[],
  totalViolations: number,
  level: 'passive' | 'aggressive' | 'nuclear'
): string {
  const base = violations.join('\n');

  if (level === 'nuclear') {
    return `
🔥🔥🔥 CRITICAL TYPE SAFETY MELTDOWN 🔥🔥🔥

${base}

You have accumulated ${totalViolations} type violations.
This is not a drill. The type system is crying.
Every undefined error in production is on you.

Please read the TypeScript utilities documentation:
- lib/utils/README.md
- lib/utils/types.ts
- lib/utils/api-types.ts

Or just use 'any' everywhere and accept chaos. Your choice.
    `;
  }

  if (level === 'aggressive') {
    return `
⚠️ SERIOUSLY, STOP IGNORING TYPE SAFETY ⚠️

${base}

Violation count: ${totalViolations}

The TypeScript utilities exist for a reason.
Use them. Your future self will thank you.
    `;
  }

  // Passive level
  return `
💭 Hey friend, just a gentle reminder:

${base}

You've got ${totalViolations} little type issues.
No pressure, but the utilities in lib/utils/ are really nice!
    `;
}

/**
 * Show random type safety tips
 */
function showRandomTypeSafetyTip() {
  const tips = [
    '💡 Tip: Use Result<T, E> instead of try-catch for cleaner error handling!',
    '💡 Tip: Branded types prevent ID mixups at compile time!',
    '💡 Tip: Discriminated unions make impossible states impossible!',
    '💡 Tip: Type guards are your friends, use them liberally!',
    '💡 Tip: Optional<T> is better than T | null | undefined!',
    '💡 Tip: Never use "as any" - there\'s always a better way!',
    '💡 Tip: The TypeScript compiler is smarter than you think!',
    '💡 Tip: Every "any" is a future runtime error waiting to happen!',
  ];

  const tip = tips[Math.floor(Math.random() * tips.length)];
  console.log(`%c${tip}`, 'color: #4fc3f7; font-weight: bold;');
}

/**
 * Hook to enforce Result pattern usage
 */
export function useResultEnforcer<T, E>(
  operation: () => Promise<T>,
  errorHandler?: (error: E) => void
): Result<T, E> | undefined {
  const [result, setResult] = useState<Result<T, E>>();
  const enforcer = useTypeEnforcer(result, 'Result', {
    enforceResult: true,
    annoyanceLevel: 'aggressive',
  });

  useEffect(() => {
    let mounted = true;

    operation()
      .then(value => {
        if (mounted) {
          setResult({ ok: true, value } as Result<T, E>);
        }
      })
      .catch(error => {
        if (mounted) {
          setResult({ ok: false, error } as Result<T, E>);
          errorHandler?.(error);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Force acknowledgment if not using Result pattern
  if (!enforcer.isTypeSafe) {
    console.warn('⚠️ You should be using Result<T, E> pattern!');
  }

  return result;
}

/**
 * The Ultimate Type Safety Enforcer
 * This will make it VERY annoying to bypass type safety
 */
export function useUltimateTypeEnforcer() {
  const [typeScore, setTypeScore] = useState(100);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Monitor global type safety
      const interval = setInterval(() => {
        const score = calculateGlobalTypeSafetyScore();
        setTypeScore(score);

        if (score < 50) {
          console.error(`
⚠️⚠️⚠️ GLOBAL TYPE SAFETY SCORE: ${score}/100 ⚠️⚠️⚠️

Your codebase type safety is critically low!
Please use the TypeScript utilities provided:

1. Result<T, E> for error handling
2. Branded types for IDs  
3. Discriminated unions for complex types
4. Type guards for runtime validation

Check lib/utils/ for all available utilities.
          `);
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, []);

  return {
    typeScore,
    isTypeSafe: typeScore > 80,
    requireTypeSafety: () => {
      if (typeScore < 80) {
        throw new Error(
          `Type safety score too low (${typeScore}/100). Please fix type violations!`
        );
      }
    },
  };
}

/**
 * Calculate a fake but annoying type safety score
 */
function calculateGlobalTypeSafetyScore(): number {
  const baseScore = 100;
  const violations = Array.from(typeViolations.values()).reduce(
    (a, b) => a + b,
    0
  );
  return Math.max(0, baseScore - violations * 5);
}

// Auto-initialize the ultimate enforcer in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log(`
╔════════════════════════════════════════════╗
║   🛡️ TYPE SAFETY ENFORCER ACTIVATED 🛡️    ║
║                                            ║
║  Monitoring for type safety violations... ║
║  Use proper TypeScript utilities or else! ║
╚════════════════════════════════════════════╝
  `);
}
