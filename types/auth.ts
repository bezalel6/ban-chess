// Centralized authentication type definitions

export type AuthProvider = 'lichess' | 'google' | 'guest';

export interface User {
  id: string;
  username: string;
  providerId: string;
  provider: AuthProvider;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AuthSession {
  user: User;
  expires: string;
}