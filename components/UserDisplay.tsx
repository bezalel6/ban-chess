'use client';

import { useAuth } from '@/components/AuthProvider';
import { signOut } from 'next-auth/react';
import { useTransition } from 'react';

// Logged-in user display
function LoggedInView({ username }: { username: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOut({ callbackUrl: '/' });
    });
  };

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 shadow-xl p-3 flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 leading-none">Playing as</span>
            <span className="text-sm text-white font-medium">{username}</span>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700"></div>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isPending ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

// Main component that decides which view to show
export default function UserDisplay() {
  const { user } = useAuth();

  // Only show the logged-in view when user is authenticated
  // No overlay shown when not authenticated - the page itself handles that
  if (!user) {
    return null;
  }

  return <LoggedInView username={user.username} />;
}
