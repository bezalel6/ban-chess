import type { IncomingMessage } from 'http';
import type { AuthProvider } from '../types/auth';
import { decode } from 'next-auth/jwt';

interface AuthToken {
  username: string;
  providerId: string;
  provider: AuthProvider;
  userId: string;
  isGuest?: boolean;
}

/**
 * Extracts and validates NextAuth JWT session token from cookies
 * Falls back to URL params for backward compatibility during transition
 * @param request - The HTTP upgrade request
 * @returns The auth token if valid, null otherwise
 */
export async function validateNextAuthToken(request: IncomingMessage): Promise<AuthToken | null> {
  try {
    // First, try to get the session from cookies (preferred method)
    const cookies = request.headers.cookie;
    
    if (cookies) {
      // Parse cookies to find the NextAuth session token
      const cookieMap = new Map<string, string>();
      cookies.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          cookieMap.set(key, decodeURIComponent(value));
        }
      });
      
      // NextAuth session token names (try both secure and non-secure)
      const sessionToken = cookieMap.get('__Secure-next-auth.session-token') || 
                          cookieMap.get('next-auth.session-token');
      
      if (sessionToken) {
        // Decode the JWT token using NextAuth's built-in decoder
        const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
        
        try {
          const decoded = await decode({
            token: sessionToken,
            secret: secret,
          });
          
          // Extract user info from the decoded token
          if (decoded && decoded.username && decoded.providerId && decoded.provider) {
            console.log('[Auth] Successfully validated session cookie for user:', decoded.username);
            return {
              username: decoded.username as string,
              providerId: decoded.providerId as string,
              provider: decoded.provider as AuthProvider,
              userId: decoded.userId as string || decoded.providerId as string,
              isGuest: decoded.isGuest as boolean | undefined,
            };
          }
        } catch (decodeError) {
          console.error('[Auth] JWT decode failed:', decodeError);
        }
      }
    }
    
    // Fallback to URL params for backward compatibility (will be removed later)
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const username = url.searchParams.get('username');
    const providerId = url.searchParams.get('providerId');
    const provider = url.searchParams.get('provider') as AuthProvider | null;
    
    if (username && providerId && provider) {
      console.log('[Auth] Using URL params (deprecated) for user:', username);
      return {
        username,
        providerId,
        provider,
        userId: providerId, // Use providerId as userId for backward compatibility
      };
    }
    
    console.log('[Auth] No valid authentication found');
    return null;
  } catch (error) {
    console.error('[Auth] Token validation error:', error);
    return null;
  }
}