'use client';

import { createContext, useContext, ReactNode, use } from 'react';
import type { SessionData } from '@/lib/auth-unified';

interface AuthContextType {
  user: SessionData | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  userPromise: Promise<SessionData | null>;
}

export function AuthProvider({ children, userPromise }: AuthProviderProps) {
  // Use React 19's use() hook to consume the promise
  const user = use(userPromise);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}