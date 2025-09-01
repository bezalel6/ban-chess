import { db, users, sessions, oauthAccounts, playerPresence } from '../db';
import { eq, and } from 'drizzle-orm';
import { generateUniqueUsername } from './username-validator';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

/**
 * NextAuth to PostgreSQL user synchronization
 * Ensures users from OAuth providers are properly saved in our database
 * Now includes session persistence and presence tracking
 */

interface OAuthUser {
  providerId: string; // Provider-specific ID (Google sub, Lichess ID, etc)
  provider: 'google' | 'lichess';
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

interface SessionInfo {
  token?: string;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create or update a user from OAuth login
 * Now properly tracks provider information and creates OAuth account links
 */
export async function upsertUserFromOAuth(
  oauthUser: OAuthUser,
  sessionInfo?: SessionInfo
): Promise<{
  id: string;
  username: string;
  role: string;
  sessionToken?: string;
}> {
  if (!oauthUser.providerId || !oauthUser.provider) {
    throw new Error(
      'Provider ID and provider type are required for OAuth user creation'
    );
  }

  try {
    // First check if OAuth account exists
    const existingOAuth = await db.query.oauthAccounts.findFirst({
      where: and(
        eq(oauthAccounts.provider, oauthUser.provider),
        eq(oauthAccounts.providerAccountId, oauthUser.providerId)
      ),
      with: {
        user: true,
      },
    });

    let userId: string;
    let username: string;
    let role: string;

    if (existingOAuth?.user) {
      // User exists via OAuth link
      userId = existingOAuth.user.id;
      username = existingOAuth.user.username;
      role = existingOAuth.user.role;

      // Update last seen and provider data
      await db
        .update(users)
        .set({
          lastSeenAt: new Date(),
          updatedAt: new Date(),
          avatarUrl: oauthUser.image || existingOAuth.user.avatarUrl,
          providerData: {
            ...((existingOAuth.user.providerData as Record<string, unknown>) ||
              {}),
            [oauthUser.provider]: {
              lastLogin: new Date().toISOString(),
              name: oauthUser.name,
            },
          },
        })
        .where(eq(users.id, userId));

      console.log(
        `[Auth] Existing user signed in: ${username} via ${oauthUser.provider}`
      );
    } else {
      // Check if user exists by email (for account linking)
      let existingUser;
      if (oauthUser.email) {
        existingUser = await db.query.users.findFirst({
          where: eq(users.email, oauthUser.email),
        });
      }

      if (existingUser) {
        // Link OAuth account to existing user
        userId = existingUser.id;
        username = existingUser.username;
        role = existingUser.role;

        // Create OAuth account link
        await db.insert(oauthAccounts).values({
          userId: existingUser.id,
          provider: oauthUser.provider,
          providerAccountId: oauthUser.providerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Update user with provider info
        await db
          .update(users)
          .set({
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            avatarUrl: oauthUser.image || existingUser.avatarUrl,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(
          `[Auth] Linked ${oauthUser.provider} account to existing user: ${username}`
        );
      } else {
        // Create new user
        const baseUsername =
          oauthUser.name || oauthUser.email?.split('@')[0] || 'User';
        const uniqueUsername = await generateUniqueUsername(baseUsername);

        userId = uuidv4();
        username = uniqueUsername;
        role = 'player';

        // Create user
        await db.insert(users).values({
          id: userId,
          username: uniqueUsername,
          email: oauthUser.email || undefined,
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
          displayName: oauthUser.name || undefined,
          avatarUrl: oauthUser.image || undefined,
          role: 'player' as const,
          isActive: true,
          providerData: {
            [oauthUser.provider]: {
              firstLogin: new Date().toISOString(),
              name: oauthUser.name,
            },
          },
          createdAt: new Date(),
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        });

        // Create OAuth account link
        await db.insert(oauthAccounts).values({
          userId,
          provider: oauthUser.provider,
          providerAccountId: oauthUser.providerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(
          `[Auth] Created new user: ${uniqueUsername} (${oauthUser.email}) via ${oauthUser.provider}`
        );
      }
    }

    // Create session if session info provided
    let sessionToken: string | undefined;
    if (sessionInfo?.token || sessionInfo?.expiresAt) {
      sessionToken = sessionInfo.token || generateSessionToken();
      const expiresAt =
        sessionInfo.expiresAt ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(sessions).values({
        userId,
        sessionToken,
        provider: oauthUser.provider,
        ipAddress: sessionInfo.ipAddress,
        userAgent: sessionInfo.userAgent,
        expiresAt,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
      });

      // Update player presence
      await db
        .insert(playerPresence)
        .values({
          userId,
          status: 'online',
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: playerPresence.userId,
          set: {
            status: 'online',
            lastHeartbeat: new Date(),
            updatedAt: new Date(),
          },
        });
    }

    return {
      id: userId,
      username,
      role,
      sessionToken,
    };
  } catch (error) {
    console.error('[Auth] Error syncing OAuth user:', error);
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
 * Get user by email with full session and presence info
 */
export async function getUserByEmail(email: string): Promise<{
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  bannedUntil?: Date | null;
  provider?: string;
  avatarUrl?: string | null;
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
    provider: user.provider,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Check if user is allowed to login
 * Now checks ban history table for more detailed ban info
 */
export async function canUserLogin(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      banHistory: {
        where: and(
          eq(users.id, userId)
          // Only get active bans
        ),
        orderBy: (banHistory, { desc }) => [desc(banHistory.bannedAt)],
        limit: 1,
      },
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (!user.isActive) {
    return { allowed: false, reason: 'Account has been deactivated' };
  }

  // Check for active bans
  const activeBan = user.banHistory?.[0];
  if (activeBan && !activeBan.liftedAt) {
    if (activeBan.expiresAt && activeBan.expiresAt > new Date()) {
      const banEndDate = activeBan.expiresAt.toLocaleDateString();
      return {
        allowed: false,
        reason: `Account is suspended until ${banEndDate}: ${activeBan.reason}`,
      };
    } else if (!activeBan.expiresAt) {
      // Permanent ban
      return {
        allowed: false,
        reason: `Account is permanently banned: ${activeBan.reason}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Create a guest user in the database
 * Guests are temporary users that can play games without OAuth
 */
export async function createGuestUser(guestData: {
  guestId: string;
  username: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  id: string;
  username: string;
  role: string;
  sessionToken: string;
}> {
  try {
    const newUserId = uuidv4();
    const sessionToken = generateSessionToken();

    // Create guest user
    await db.insert(users).values({
      id: newUserId,
      username: guestData.username,
      email: guestData.email || undefined,
      provider: 'guest',
      providerId: guestData.guestId,
      role: 'guest' as const,
      isActive: true,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    });

    // Create session for guest
    await db.insert(sessions).values({
      userId: newUserId,
      sessionToken,
      provider: 'guest',
      ipAddress: guestData.ipAddress,
      userAgent: guestData.userAgent,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for guests
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    });

    // Set online presence
    await db.insert(playerPresence).values({
      userId: newUserId,
      status: 'online',
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    });

    console.log(
      `[Auth] Created guest user: ${guestData.username} (${newUserId})`
    );

    return {
      id: newUserId,
      username: guestData.username,
      role: 'guest',
      sessionToken,
    };
  } catch (error) {
    console.error('[Auth] Error creating guest user:', error);
    throw error;
  }
}

/**
 * Validate and refresh session
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  username?: string;
  role?: string;
}> {
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.sessionToken, sessionToken),
      eq(sessions.isActive, true)
    ),
    with: {
      user: true,
    },
  });

  if (!session || !session.user) {
    return { valid: false };
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, session.id));
    return { valid: false };
  }

  // Update last activity
  await db
    .update(sessions)
    .set({ lastActivity: new Date() })
    .where(eq(sessions.id, session.id));

  // Update presence
  await db
    .insert(playerPresence)
    .values({
      userId: session.userId,
      status: 'online',
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: playerPresence.userId,
      set: {
        status: 'online',
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      },
    });

  return {
    valid: true,
    userId: session.user.id,
    username: session.user.username,
    role: session.user.role,
  };
}

/**
 * End user session
 */
export async function endSession(sessionToken: string): Promise<void> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionToken, sessionToken),
  });

  if (session) {
    // Mark session as inactive
    await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, session.id));

    // Update presence to offline
    await db
      .update(playerPresence)
      .set({
        status: 'offline',
        updatedAt: new Date(),
      })
      .where(eq(playerPresence.userId, session.userId));
  }
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
