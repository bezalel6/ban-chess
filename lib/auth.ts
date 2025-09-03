import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthProvider } from "../types/auth";
import { generateGuestId } from "./username";
import { CustomPrismaAdapter } from "./auth-adapter";
import prisma from "./prisma";
import { isAdminEmail } from "./startup-admin";

interface LichessProfile {
  id: string;
  username: string;
  email?: string;
}

// Separate cookie configurations for clarity
const productionCookies = {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      // Set domain to share session across subdomains (chess.rndev.site and ws-chess.rndev.site)
      domain: '.rndev.site'
    }
  },
  callbackUrl: {
    name: `__Secure-next-auth.callback-url`,
    options: {
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      // No domain for callback URL - only needed on main domain
    }
  },
  csrfToken: {
    name: `__Host-next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      // Note: __Host- cookies cannot have a domain attribute
      domain: undefined
    }
  },
  pkceCodeVerifier: {
    name: `__Secure-next-auth.pkce.code_verifier`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      maxAge: 60 * 15, // 15 minutes
      // No domain - only needed during OAuth flow
    }
  },
  state: {
    name: `__Secure-next-auth.state`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      maxAge: 60 * 15, // 15 minutes
      // No domain - only needed during OAuth flow
    }
  },
  nonce: {
    name: `__Secure-next-auth.nonce`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: true,
      // No domain - only needed during OAuth flow
    }
  }
};

const developmentCookies = {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      domain: undefined // No domain restriction in development
    }
  },
  callbackUrl: {
    name: `next-auth.callback-url`,
    options: {
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      domain: undefined
    }
  },
  csrfToken: {
    name: `next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      domain: undefined
    }
  },
  pkceCodeVerifier: {
    name: `next-auth.pkce.code_verifier`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      maxAge: 60 * 15, // 15 minutes
      domain: undefined
    }
  },
  state: {
    name: `next-auth.state`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      maxAge: 60 * 15, // 15 minutes
      domain: undefined
    }
  },
  nonce: {
    name: `next-auth.nonce`,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
      domain: undefined
    }
  }
};

const isProduction = process.env.NODE_ENV === 'production';

// Log configuration for debugging
console.log(`[NextAuth Config] Environment: ${process.env.NODE_ENV}`);
console.log(`[NextAuth Config] NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
console.log(`[NextAuth Config] Secret configured: ${!!process.env.NEXTAUTH_SECRET}`);
console.log(`[NextAuth Config] Using ${isProduction ? 'production' : 'development'} cookie configuration`);
console.log(`[NextAuth Config] Session cookie domain: ${isProduction ? '.rndev.site' : 'none (localhost)'}`);
console.log(`[NextAuth Config] WebSocket expected at: ${process.env.NEXT_PUBLIC_WS_URL || 'NOT SET'}`);

// Production requires NEXTAUTH_SECRET to be set
if (isProduction && !process.env.NEXTAUTH_SECRET) {
  console.error(`⚠️ [NextAuth] NEXTAUTH_SECRET must be set in production! Authentication will fail.`);
  console.error(`⚠️ [NextAuth] Using development secret as fallback - THIS IS INSECURE!`);
}

export const authOptions = {
  adapter: CustomPrismaAdapter(),
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
  session: {
    strategy: "jwt" as const, // JWT strategy with database adapter for hybrid approach
  },
  cookies: isProduction ? productionCookies : developmentCookies,
  // Enable debug logging in production if AUTH_DEBUG is set
  debug: process.env.AUTH_DEBUG === "true",
  providers: [
    // Guest login provider
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        // Always succeed for guest login - use boring Guest ID
        const guestName = generateGuestId();
        const guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;

        return {
          id: guestId,
          name: guestName,
          email: null, // Guest users have no email
        };
      },
    }),
    {
      id: "lichess",
      name: "Lichess",
      type: "oauth" as const,
      authorization: {
        url: "https://lichess.org/oauth",
        params: {
          // Request email:read scope to get user's email if available
          // Also keep preference:read for potential future features
          scope: "email:read",
        },
      },
      token: "https://lichess.org/api/token",
      userinfo: "https://lichess.org/api/account",
      clientId: process.env.LICHESS_CLIENT_ID || "2ban-2chess-local-dev",
      clientSecret: "", // Lichess doesn't require a secret for public clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: ["pkce" as any, "state" as any],
      client: {
        token_endpoint_auth_method: "none" as const,
      },
      profile(profile: LichessProfile) {
        // Only use the real email if provided by Lichess
        // Don't create fake emails as this could cause security issues
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email || null, // Use null if no email, not a fake one
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
    async jwt({ token, account, profile, user }: any) {
      // On initial sign-in, account will be present
      if (account) {
        // Store user ID from database (adapter already created the user)
        if (user?.id) {
          token.userId = user.id;
          token.username = user.username; // Username already generated by adapter
          token.isGuest = user.isGuest;
          // Check if user should be admin based on email
          token.isAdmin = user.isAdmin || isAdminEmail(user.email);
        }

        // Handle Lichess profile metadata
        if (account.provider === "lichess" && profile) {
          const lichessProfile = profile as LichessProfile;
          token.providerId = lichessProfile.id;
          token.provider = "lichess";
          token.originalUsername = lichessProfile.username; // Store original for display
        }
        // Handle Google profile metadata
        else if (account.provider === "google" && profile) {
          token.providerId = profile.sub;
          token.provider = "google";
          token.originalName = profile.name || profile.email?.split("@")[0]; // Store original for display
        }
        // Handle Guest login (CredentialsProvider)
        else if (account.provider === "guest" && user) {
          // Guest users: no email, just temporary ID
          const guestId = user.name; // Already using generateGuestId() from authorize()

          // Create guest user in database (no email!)
          const guestUser = await prisma.user.create({
            data: {
              name: guestId,
              username: guestId, // Guest ID format, not chess username
              isGuest: true,
              // No email for guest users
            },
          });

          token.userId = guestUser.id;
          token.username = guestId; // Keep guest ID format
          token.providerId = user.id;
          token.provider = "guest";
          token.isGuest = true; // Flag for guest users
        }
      }

      // Load user data from database on subsequent requests
      if (!account && token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { id: true, username: true, email: true, isGuest: true, isAdmin: true },
        });

        if (dbUser) {
          token.username = dbUser.username;
          token.isGuest = dbUser.isGuest;
          // Check both database and environment for admin status
          token.isAdmin = dbUser.isAdmin || isAdminEmail(dbUser.email);
          
          // Update database if email is in admin list but not marked as admin yet
          if (!dbUser.isAdmin && isAdminEmail(dbUser.email)) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { isAdmin: true }
            });
          }
        }
      }

      // Preserve existing token data on subsequent requests
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.userId = token.userId as string; // Pass the database user ID
        session.user.username = token.username as string;
        session.user.providerId = token.providerId as string;
        session.user.provider = token.provider as AuthProvider;
        session.user.originalUsername = token.originalUsername as
          | string
          | undefined;
        session.user.originalName = token.originalName as string | undefined;
        session.user.isNewUser = token.isNewUser as boolean | undefined;
        session.user.isGuest = token.isGuest as boolean | undefined;
        session.user.isAdmin = token.isAdmin as boolean | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    // Instead of redirecting to error page, we'll handle errors in SignInPanel via toast
    error: "/auth/signin", // Redirect back to signin with error in URL params
  },
};
