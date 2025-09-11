import type { IncomingMessage } from 'http';
import type { AuthProvider } from '@/types/auth';
import { decode } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

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
    console.log('[Auth] Raw cookie header:', cookies ? cookies.substring(0, 100) : 'No cookies');
    
    if (cookies) {
      // Parse cookies to find the NextAuth session token
      const cookieMap = new Map<string, string>();
      cookies.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          cookieMap.set(key, decodeURIComponent(value));
        }
      });
      console.log('[Auth] Parsed cookie keys:', Array.from(cookieMap.keys()));
      
      // NextAuth session token names (prefer non-secure in development)
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const secureToken = cookieMap.get('__Secure-next-auth.session-token');
      const nonSecureToken = cookieMap.get('next-auth.session-token');
      
      console.log('[Auth] Secure token:', secureToken ? secureToken.substring(0, 50) : 'none');
      console.log('[Auth] Non-secure token:', nonSecureToken ? nonSecureToken.substring(0, 50) : 'none');
      
      const sessionToken = isDevelopment 
        ? (nonSecureToken || secureToken)
        : (secureToken || nonSecureToken);
      
      if (sessionToken) {
        console.log('[Auth] Found session token, first 50 chars:', sessionToken.substring(0, 50));
        
        // Check if this looks like a session ID (UUID format) vs JWT
        const isSessionId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sessionToken);
        
        if (isSessionId) {
          // This is a database session ID, look it up
          console.log('[Auth] Token is a session ID, looking up in database...');
          try {
            const session = await prisma.session.findUnique({
              where: { sessionToken },
              include: { user: true }
            });
            
            if (session && session.user && session.expires > new Date()) {
              console.log('[Auth] Found valid session for user:', session.user.username);
              
              // Get the account to find provider info
              const account = await prisma.account.findFirst({
                where: { userId: session.user.id }
              });
              
              return {
                username: session.user.username || session.user.name || 'Unknown',
                providerId: account?.providerAccountId || session.user.id,
                provider: (account?.provider || 'guest') as AuthProvider,
                userId: session.user.id,
                isGuest: session.user.isGuest || false,
              };
            } else if (session) {
              console.log('[Auth] Session expired');
            } else {
              console.log('[Auth] Session not found in database');
            }
          } catch (dbError) {
            console.error('[Auth] Database error looking up session:', dbError);
          }
        } else {
          // Try to decode as JWT
          const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
          console.log('[Auth] Token looks like JWT, attempting decode...');
          
          try {
            const decoded = await decode({
              token: sessionToken,
              secret: secret,
            });
            
            // Extract user info from the decoded token
            if (decoded && decoded.username && decoded.providerId && decoded.provider) {
              console.log('[Auth] Successfully decoded JWT for user:', decoded.username);
              return {
                username: decoded.username as string,
                providerId: decoded.providerId as string,
                provider: decoded.provider as AuthProvider,
                userId: decoded.userId as string || decoded.providerId as string,
                isGuest: decoded.isGuest as boolean | undefined,
              };
            } else if (decoded) {
              // Log what fields we have to help debug
              console.log('[Auth] Decoded token but missing required fields. Has:', Object.keys(decoded || {}));
            }
          } catch (decodeError) {
            // Only log JWT errors if they're not just invalid/expired tokens
            const error = decodeError as Error & { code?: string };
            if (error.code === 'ERR_JWE_INVALID') {
              console.log('[Auth] JWT is invalid (likely corrupted or wrong secret)');
            } else if (error.code === 'ERR_JWT_EXPIRED') {
              console.log('[Auth] JWT expired');
            } else {
              console.error('[Auth] JWT decode error:', error.message || error);
            }
          }
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
    
    // Don't log this - it's normal for some connections to be unauthenticated
    // console.log('[Auth] No valid authentication found');
    return null;
  } catch (error) {
    console.error('[Auth] Token validation error:', error);
    return null;
  }
}