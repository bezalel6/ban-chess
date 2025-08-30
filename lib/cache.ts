import 'server-only';
import { unstable_cache } from 'next/cache';
import { getCurrentUser } from '@/lib/auth-unified';

// Cache tags for selective invalidation
export const CACHE_TAGS = {
  USER_SESSION: 'user-session',
  GAME_STATE: 'game-state',
  ACTIVE_USERS: 'active-users',
  USER_STATS: 'user-stats',
} as const;

// Cache durations
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
} as const;

// Cached user lookup with optimized revalidation
export const getCachedUser = unstable_cache(
  async () => {
    return getCurrentUser();
  },
  ['current-user'],
  {
    tags: [CACHE_TAGS.USER_SESSION],
    revalidate: CACHE_DURATION.SHORT,
  }
);

// Cache user activity data
export const getCachedUserActivity = unstable_cache(
  async (userId: string) => {
    // In a real app, this would fetch from database
    return {
      userId,
      gamesPlayed: 0,
      gamesWon: 0,
      lastActive: new Date().toISOString(),
    };
  },
  ['user-activity'],
  {
    tags: [CACHE_TAGS.USER_STATS],
    revalidate: CACHE_DURATION.MEDIUM,
  }
);

// Cache active user count with longer duration since it's expensive
export const getCachedActiveUserCount = unstable_cache(
  async () => {
    const { getActiveUserCount } = await import('@/lib/auth-unified');
    return getActiveUserCount();
  },
  ['active-user-count'],
  {
    tags: [CACHE_TAGS.ACTIVE_USERS],
    revalidate: CACHE_DURATION.LONG,
  }
);

// Game-specific caching (for when we add game persistence)
export const getCachedGameState = unstable_cache(
  async (_gameId: string) => {
    // Placeholder for game state caching
    // In production, this would fetch from database
    return null;
  },
  ['game-state'],
  {
    tags: [CACHE_TAGS.GAME_STATE],
    revalidate: CACHE_DURATION.SHORT,
  }
);

// Utility function to create custom cached functions
export function createCachedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyParts: string[],
  options: {
    tags?: string[];
    revalidate?: number;
  } = {}
) {
  return unstable_cache(fn, keyParts, {
    tags: options.tags || [],
    revalidate: options.revalidate || CACHE_DURATION.MEDIUM,
  });
}

// Type-safe cache key generator
export function generateCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return [prefix, ...parts.map(String)].join('-');
}
