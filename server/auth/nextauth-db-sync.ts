import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import { generateUniqueUsername } from './username-validator';
import { v4 as uuidv4 } from 'uuid';

/**
 * NextAuth to PostgreSQL user synchronization
 * Ensures users from OAuth providers are properly saved in our database
 */

interface OAuthUser {
  providerId: string; // Provider-specific ID (Google sub, Lichess ID, etc)
  provider: 'google' | 'lichess';
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

/**
 * Create or update a user from OAuth login
 * Handles username collisions and profanity filtering
 * Works with multiple OAuth providers (Google, Lichess)
 */
export async function upsertUserFromOAuth(oauthUser: OAuthUser): Promise<{
  id: string;
  username: string;
  role: string;
}> {
  if (!oauthUser.providerId || !oauthUser.provider) {
    throw new Error(
      'Provider ID and provider type are required for OAuth user creation'
    );
  }

  try {
    // Check if user exists by email first (primary identifier)
    let existingUser;

    if (oauthUser.email) {
      existingUser = await db.query.users.findFirst({
        where: eq(users.email, oauthUser.email),
      });
    }

    if (existingUser) {
      // Update last seen
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, existingUser.id));

      console.log(
        `[Auth] Existing user signed in: ${existingUser.username} via ${oauthUser.provider}`
      );

      return {
        id: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
      };
    }

    // Create new user
    const baseUsername =
      oauthUser.name || oauthUser.email?.split('@')[0] || 'User';
    const uniqueUsername = await generateUniqueUsername(baseUsername);

    const newUserId = uuidv4();
    const newUser = {
      id: newUserId,
      username: uniqueUsername,
      email: oauthUser.email || undefined,
      role: 'player' as const, // Default role for new users
      isActive: true,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    };

    await db.insert(users).values(newUser);

    console.log(
      `[Auth] Created new user: ${uniqueUsername} (${oauthUser.email}) via ${oauthUser.provider}`
    );

    return {
      id: newUserId,
      username: uniqueUsername,
      role: 'player',
    };
  } catch (error) {
    console.error('[Auth] Error syncing OAuth user:', error);
    // Add more detailed error information for debugging
    if (error instanceof Error) {
      console.error('[Auth] Error details:', {
        message: error.message,
        stack: error.stack,
        provider: oauthUser.provider,
        email: oauthUser.email,
      });
    }
    throw error;
  }
}

/**
 * Get user by Google ID (for JWT enrichment)
 */
export async function getUserByEmail(email: string): Promise<{
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  bannedUntil?: Date | null;
} | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    bannedUntil: user.bannedUntil,
  };
}

/**
 * Check if user is allowed to login
 */
export async function canUserLogin(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (!user.isActive) {
    return { allowed: false, reason: 'Account has been deactivated' };
  }

  if (user.bannedUntil && user.bannedUntil > new Date()) {
    const banEndDate = user.bannedUntil.toLocaleDateString();
    return {
      allowed: false,
      reason: `Account is suspended until ${banEndDate}${user.banReason ? ': ' + user.banReason : ''}`,
    };
  }

  return { allowed: true };
}
