'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function UserInfo() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    // Add confirmation dialog
    const confirmLogout = window.confirm('Are you sure you want to sign out? You will lose any ongoing games.');
    if (!confirmLogout) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      // Redirect to home page after logout
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-3 bg-slate-800/90 backdrop-blur-sm px-4 py-2.5 rounded-lg shadow-lg border border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-300">
          Playing as: <strong className="text-white">{user.username}</strong>
        </span>
      </div>
      <button
        onClick={handleSignOut}
        disabled={isLoggingOut}
        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
        title="Sign out and return to login"
      >
        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}