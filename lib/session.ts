import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  userId: string;
  username: string;
  isLoggedIn: boolean;
  createdAt: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_change_this_in_production',
  cookieName: '2ban-2chess-session',
  ttl: 60 * 60 * 24 * 7, // 1 week
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

// This function should only be called from Server Components or API routes
export async function getSession() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

// In-memory store for active users (in production, use Redis or a database)
export const activeUsers = new Map<string, { username: string; userId: string; socketId?: string }>();

export function isUsernameTaken(username: string): boolean {
  const normalizedUsername = username.toLowerCase().trim();
  for (const user of activeUsers.values()) {
    if (user.username.toLowerCase() === normalizedUsername) {
      return true;
    }
  }
  return false;
}

export function generateGuestUsername(): string {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `GUEST-${number}`;
}