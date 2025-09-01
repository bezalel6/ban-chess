/**
 * Centralized UUID conversion utility
 * Ensures consistent handling of user IDs across the entire system
 *
 * OAuth users: Already have UUIDs from providers
 * Guest users: String usernames are converted to deterministic UUIDs
 */

import { v5 as uuidv5 } from 'uuid';

// Pattern that accepts any UUID version
const ANY_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return ANY_UUID_REGEX.test(id);
}

/**
 * Convert any user ID to a valid UUID
 * - If already a UUID, return as-is
 * - If not, generate a deterministic UUID from the string
 *
 * @param userId - The user ID (UUID or username)
 * @returns A valid UUID string
 */
export function toUUID(userId: string): string {
  if (!userId) {
    throw new Error('User ID cannot be empty');
  }

  // If it's already a valid UUID, return it
  if (isValidUUID(userId)) {
    return userId;
  }

  // Generate deterministic UUID from the string
  // Using URL namespace for consistency
  return uuidv5(userId, uuidv5.URL);
}

/**
 * Convert multiple user IDs to UUIDs
 */
export function toUUIDs(userIds: string[]): string[] {
  return userIds.map(toUUID);
}

/**
 * Convert optional user ID to UUID
 */
export function toOptionalUUID(userId?: string | null): string | undefined {
  if (!userId) return undefined;
  return toUUID(userId);
}

/**
 * Determine if a user is a guest based on their ID
 */
export function isGuestUser(userId: string): boolean {
  return !isValidUUID(userId);
}

/**
 * Get provider type based on user ID format
 */
export function getProviderFromId(userId: string): 'oauth' | 'guest' {
  return isValidUUID(userId) ? 'oauth' : 'guest';
}

/**
 * Create a consistent cache key for a user
 * This ensures Redis keys work with both UUID and non-UUID users
 */
export function getUserCacheKey(userId: string): string {
  // Always use the original ID for cache keys to maintain consistency
  // This prevents cache misses when the same user is referenced by different formats
  return userId;
}
