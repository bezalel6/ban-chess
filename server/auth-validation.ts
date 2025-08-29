import type { IncomingMessage } from 'http';

interface AuthToken {
  username: string;
  providerId: string;
  provider: 'lichess' | 'google';
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
    const provider = url.searchParams.get('provider') as 'lichess' | 'google' | null;

    if (!username || !providerId || !provider) {
      return null;
    }

    return {
      username,
      providerId,
      provider
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}