import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthProvider } from '../types/auth';
import {
  upsertUserFromOAuth,
  getUserByEmail,
  canUserLogin,
  createGuestUser,
} from '../server/auth/nextauth-db-sync';
import { generateUniqueUsername } from '../server/auth/username-validator';
import { generateChessGuestName } from './chess-guest-names';

interface LichessProfile {
  id: string;
  username: string;
  email?: string;
}

// TODO(human): Update the authOptions below to use Env class methods
// Replace process.env.NEXTAUTH_SECRET with appropriate Env method
// Replace process.env.LICHESS_CLIENT_ID with Env.getAuthConfig().lichessClientId
// Replace process.env.GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET with Env.getAuthConfig() values
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  session: {
    strategy: 'jwt' as const,
  },
  providers: [
    // Guest login provider
    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        // Always succeed for guest login - generate unique guest ID
        const guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;
        // Use chess-themed name generator for fun guest names
        const guestName = generateChessGuestName();

        return {
          id: guestId,
          name: guestName,
          email: `${guestId}@guest.local`,
        };
      },
    }),
    {
      id: 'lichess',
      name: 'Lichess',
      type: 'oauth' as const,
      authorization: {
        url: 'https://lichess.org/oauth',
        params: {
          scope: 'preference:read',
        },
      },
      token: 'https://lichess.org/api/token',
      userinfo: 'https://lichess.org/api/account',
      clientId: process.env.LICHESS_CLIENT_ID || '2ban-2chess-local-dev',
      clientSecret: '', // Lichess doesn't require a secret for public clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: ['pkce' as any, 'state' as any],
      client: {
        token_endpoint_auth_method: 'none' as const,
      },
      profile(profile: LichessProfile) {
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email || `${profile.username}@lichess.org`,
          image: null,
        };
      },
    },
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account, profile }: any) {
      try {
        // Sync user to PostgreSQL on sign in for OAuth providers
        if (account?.provider === 'google' && profile) {
          const dbUser = await upsertUserFromOAuth({
            providerId: profile.sub,
            provider: 'google',
            email: profile.email,
            name: profile.name,
            image: profile.picture,
          });

          // Check if user is allowed to login
          const loginCheck = await canUserLogin(dbUser.id);
          if (!loginCheck.allowed) {
            // Return false with reason (NextAuth will redirect to error page)
            // Sanitize the error message to remove newlines and special characters
            const sanitizedReason = (loginCheck.reason || 'Access denied')
              .replace(/[\n\r]/g, ' ')
              .replace(/[^\w\s\-.:]/g, '')
              .substring(0, 100);
            throw new Error(sanitizedReason);
          }
        } else if (account?.provider === 'lichess' && user) {
          // Sync Lichess user to database
          const lichessProfile = profile as LichessProfile;
          const dbUser = await upsertUserFromOAuth({
            providerId: lichessProfile.id,
            provider: 'lichess',
            email:
              lichessProfile.email || `${lichessProfile.username}@lichess.org`,
            name: lichessProfile.username,
            image: null,
          });

          // Check if user is allowed to login
          const loginCheck = await canUserLogin(dbUser.id);
          if (!loginCheck.allowed) {
            const sanitizedReason = (loginCheck.reason || 'Access denied')
              .replace(/[\n\r]/g, ' ')
              .replace(/[^\w\s\-.:]/g, '')
              .substring(0, 100);
            throw new Error(sanitizedReason);
          }
        } else if (account?.provider === 'guest') {
          // Create guest user with unique username and database entry
          const guestUsername = await generateUniqueUsername(
            user.name || 'Guest'
          );
          user.name = guestUsername; // Update the guest name to be unique

          // Create database entry for guest user
          const dbUser = await createGuestUser({
            guestId: user.id,
            username: guestUsername,
            email: user.email || undefined,
          });

          // Store the database ID for later use
          user.dbUserId = dbUser.id;
        }

        return true; // Allow sign in
      } catch (error) {
        console.error('[Auth] Sign in error:', error);
        // Sanitize error message for headers
        const message =
          error instanceof Error ? error.message : 'Authentication failed';
        const sanitized = message
          .replace(/[\n\r]/g, ' ')
          .replace(/[^\w\s\-.:]/g, '')
          .substring(0, 100);
        throw new Error(sanitized);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile, user }: any) {
      try {
        // On first login, account will be present
        if (account) {
          // Handle Lichess profile
          if (account.provider === 'lichess' && profile) {
            const lichessProfile = profile as LichessProfile;
            // Get the database user to use our ID and username
            const email =
              lichessProfile.email || `${lichessProfile.username}@lichess.org`;
            const dbUser = await getUserByEmail(email);
            if (dbUser) {
              token.dbUserId = dbUser.id; // Our PostgreSQL UUID
              token.username = dbUser.username; // Our sanitized username
              token.role = dbUser.role; // User role for permissions
            } else {
              token.username = lichessProfile.username;
            }
            token.providerId = lichessProfile.id;
            token.provider = 'lichess';
          }
          // Handle Google profile
          else if (account.provider === 'google' && profile) {
            // Get the database user to use our ID and username
            const dbUser = await getUserByEmail(profile.email);
            if (dbUser) {
              token.dbUserId = dbUser.id; // Our PostgreSQL UUID
              token.username = dbUser.username; // Our sanitized username
              token.role = dbUser.role; // User role for permissions
            } else {
              token.username =
                profile.name || profile.email?.split('@')[0] || 'User';
            }
            token.providerId = profile.sub;
            token.provider = 'google';
          }
          // Handle Guest login (CredentialsProvider)
          else if (account.provider === 'guest' && user) {
            // For guests, we need to retrieve the dbUserId that was set during signIn
            // Since user.dbUserId is set in signIn callback, we can use it here
            token.username = user.name;
            token.providerId = user.id;
            token.provider = 'guest';
            token.role = 'guest';
            token.dbUserId = user.dbUserId; // This was set in the signIn callback
          }
        }
        return token;
      } catch (error) {
        console.error('[Auth] JWT callback error:', error);
        // Return the token as-is if there's an error to allow the session to continue
        return token;
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.username = token.username as string;
        session.user.providerId = token.providerId as string;
        session.user.provider = token.provider as AuthProvider;
        session.user.dbUserId = token.dbUserId as string; // Our PostgreSQL ID
        session.user.role = (token.role as string) || 'player'; // User role
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
