// Centralized authentication type definitions

export type AuthProvider = "lichess" | "google" | "guest";

export interface User {
  id: string;
  username: string;
  providerId: string;
  provider: AuthProvider;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  originalUsername?: string; // Lichess username for display
  originalName?: string; // Google name for display
  isNewUser?: boolean; // First-time user flag
  isGuest?: boolean; // Guest user flag
  lastUsernameChange?: number; // Timestamp of last username change
}

export interface AuthSession {
  user: User;
  expires: string;
}
