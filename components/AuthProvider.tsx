'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import type { AuthProvider as AuthProviderType } from '../types/auth';

interface User {
  userId: string;
  username: string;
  provider: AuthProviderType;
  isAdmin?: boolean;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component that uses useSession
function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [anonymousUser, setAnonymousUser] = useState<User | null>(null);
  
  // Initialize anonymous user if no session
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      // Generate or retrieve anonymous user ID from localStorage
      const storedGuestId = localStorage.getItem('anonymous-user-id');
      const guestId = storedGuestId || `anon_${Math.random().toString(36).substring(2, 15)}`;
      
      if (!storedGuestId) {
        localStorage.setItem('anonymous-user-id', guestId);
      }
      
      setAnonymousUser({
        userId: guestId,
        username: `Anonymous`,
        provider: 'guest' as AuthProviderType,
        isAdmin: false
      });
    } else {
      // Clear anonymous user when signed in
      setAnonymousUser(null);
    }
  }, [session, status]);
  
  // Cast to our extended user type
  const extendedUser = session?.user as { 
    userId?: string;
    providerId?: string; 
    username?: string;
    provider?: AuthProviderType;
    isAdmin?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | undefined;
  
  const authenticatedUser = extendedUser?.username && extendedUser?.provider ? {
    // Use userId if available, fall back to providerId (matches server logic)
    userId: extendedUser.userId || extendedUser.providerId || '',
    username: extendedUser.username,
    provider: extendedUser.provider,
    isAdmin: extendedUser.isAdmin,
    isAnonymous: false
  } : null;
  
  // Use authenticated user if available, otherwise use anonymous user
  const user = authenticatedUser || anonymousUser;
  
  // Never show loading after initial check - always have a user (authenticated or anonymous)
  const loading = status === 'loading' && !anonymousUser;

  return (
    <AuthContext.Provider value={{ user, loading }}>
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