import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, IronSession } from 'iron-session';
import { cache } from 'react';
import { z } from 'zod';

// Unified session data interface
export interface SessionData {
  userId?: string;
  username?: string;
  isLoggedIn?: boolean;
  createdAt?: number;
}

// Validation schemas
const usernameSchema = z
  .string()
  .min(2, 'Username must be at least 2 characters')
  .max(20, 'Username must not exceed 20 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores'
  )
  .transform(s => s.trim());

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    'complex_password_at_least_32_characters_long_change_this_in_production',
  cookieName: 'chess_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// In-memory store for active users (in production, use Redis or a database)
const activeUsers = new Map<
  string,
  { username: string; userId: string; lastSeen: number }
>();

// Cache the session for the current request
export const getSession = cache(async (): Promise<IronSession<SessionData>> => {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
});

// Get current user with caching
export const getCurrentUser = cache(async (): Promise<SessionData | null> => {
  const session = await getSession();
  if (!session.userId || !session.username) return null;

  return {
    userId: session.userId,
    username: session.username,
    isLoggedIn: session.isLoggedIn,
    createdAt: session.createdAt,
  };
});

// Username validation utility
export function isUsernameTaken(username: string): boolean {
  const normalizedUsername = username.toLowerCase().trim();
  const now = Date.now();

  // Clean up old entries (older than 1 hour)
  for (const [userId, userData] of activeUsers.entries()) {
    if (now - userData.lastSeen > 60 * 60 * 1000) {
      activeUsers.delete(userId);
    }
  }

  // Check if username is taken
  for (const userData of activeUsers.values()) {
    if (userData.username.toLowerCase() === normalizedUsername) {
      return true;
    }
  }
  return false;
}

// Login result types
export type LoginResult =
  | { success: true; user: { userId: string; username: string } }
  | { success: false; error: string };

// Enhanced login function with proper validation
export async function login(username: string): Promise<LoginResult> {
  try {
    // Validate username
    const validatedUsername = usernameSchema.parse(username);

    // Check if username is taken
    if (isUsernameTaken(validatedUsername)) {
      return { success: false, error: 'Username is already taken' };
    }

    const session = await getSession();

    // Generate unique user ID
    const userId = crypto.randomUUID();
    const now = Date.now();

    // Save to session
    session.userId = userId;
    session.username = validatedUsername;
    session.isLoggedIn = true;
    session.createdAt = now;
    await session.save();

    // Add to active users
    activeUsers.set(userId, {
      username: validatedUsername,
      userId,
      lastSeen: now,
    });

    return {
      success: true,
      user: { userId, username: validatedUsername },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid username format' };
  }
}

// Logout function
export async function logout(): Promise<void> {
  const session = await getSession();

  // Remove from active users if exists
  if (session.userId) {
    activeUsers.delete(session.userId);
  }

  session.destroy();
  await session.save();
}

// Update user activity
export async function updateUserActivity(): Promise<void> {
  const user = await getCurrentUser();
  if (user?.userId) {
    const userData = activeUsers.get(user.userId);
    if (userData) {
      userData.lastSeen = Date.now();
    }
  }
}

// Get active user count (useful for analytics)
export function getActiveUserCount(): number {
  const now = Date.now();
  let activeCount = 0;

  for (const userData of activeUsers.values()) {
    if (now - userData.lastSeen <= 60 * 60 * 1000) {
      // Active within last hour
      activeCount++;
    }
  }

  return activeCount;
}
