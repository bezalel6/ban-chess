'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';

interface AuthContextType {
  user: {
    userId: string;
    username: string;
  } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component that uses useSession
function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  
  // Cast to our extended user type
  const extendedUser = session?.user as { 
    providerId?: string; 
    username?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | undefined;
  
  const user = extendedUser?.providerId && extendedUser?.username ? {
    userId: extendedUser.providerId,
    username: extendedUser.username
  } : null;

  return (
    <AuthContext.Provider value={{ user, loading: status === 'loading' }}>
      {children}
    </AuthContext.Provider>
  );
}

// Main provider that wraps with SessionProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}