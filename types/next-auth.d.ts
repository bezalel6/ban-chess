import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username: string;
      providerId: string;
      provider: 'lichess' | 'google' | 'guest';
    } & DefaultSession["user"]
  }

  interface User {
    username?: string;
    providerId?: string;
    provider?: 'lichess' | 'google';
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    providerId?: string;
    provider?: 'lichess' | 'google';
  }
}