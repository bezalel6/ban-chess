import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, IronSession } from 'iron-session';

export interface SessionData {
  userId?: string;
  username?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'chess_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    userId: session.userId,
    username: session.username,
  };
}

export async function login(username: string): Promise<{ success: boolean; user?: SessionData; error?: string }> {
  // Validate username
  const usernameRegex = /^[a-zA-Z0-9]{2,20}$/;
  if (!usernameRegex.test(username)) {
    return { 
      success: false, 
      error: 'Username must be between 2 and 20 alphanumeric characters' 
    };
  }

  const session = await getSession();
  
  // Generate unique user ID
  const userId = crypto.randomUUID();
  
  // Save to session
  session.userId = userId;
  session.username = username;
  await session.save();

  return { 
    success: true, 
    user: { userId, username } 
  };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}