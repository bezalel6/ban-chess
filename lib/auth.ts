import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthProvider } from "../types/auth";

interface LichessProfile {
  id: string;
  username: string;
  email?: string;
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    // Guest login provider
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        // Always succeed for guest login - generate unique guest ID
        const guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;
        const guestName = `Guest_${guestId.substring(6)}`;
        
        return {
          id: guestId,
          name: guestName,
          email: `${guestId}@guest.local`,
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
          scope: "preference:read",
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
    async jwt({ token, account, profile, user }: any) {
      // On first login, account will be present
      if (account) {
        // Handle Lichess profile
        if (account.provider === 'lichess' && profile) {
          const lichessProfile = profile as LichessProfile;
          token.username = lichessProfile.username;
          token.providerId = lichessProfile.id;
          token.provider = 'lichess';
        }
        // Handle Google profile
        else if (account.provider === 'google' && profile) {
          token.username = profile.name || profile.email?.split('@')[0] || 'User';
          token.providerId = profile.sub;
          token.provider = 'google';
        }
        // Handle Guest login (CredentialsProvider)
        else if (account.provider === 'guest' && user) {
          token.username = user.name;
          token.providerId = user.id;
          token.provider = 'guest';
        }
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.username = token.username as string;
        session.user.providerId = token.providerId as string;
        session.user.provider = token.provider as AuthProvider;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};