import type { IncomingMessage } from 'http';
import type { AuthProvider } from '../types/auth';

interface AuthToken {
  username: string;
  providerId: string;
  provider: AuthProvider;
  dbUserId?: string; // Our PostgreSQL user ID
  role?: string; // User role (player, moderator, admin, etc.)
}

/**
 * Extracts auth token from WebSocket connection request
 * For now, we'll pass auth info via query params during WebSocket connection
 * @param request - The HTTP upgrade request
 * @returns The auth token if valid, null otherwise
 */
export async function validateNextAuthToken(request: IncomingMessage): Promise<AuthToken | null> {
  try {
    // Parse URL to get query parameters
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const username = url.searchParams.get('username');
    const providerId = url.searchParams.get('providerId');
    const provider = url.searchParams.get('provider') as AuthProvider | null;
    const dbUserId = url.searchParams.get('dbUserId');
    const role = url.searchParams.get('role');

    if (!username || !providerId || !provider) {
      return null;
    }

    return {
      username,
      providerId,
      provider,
      dbUserId: dbUserId || undefined,
      role: role || 'player'
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}