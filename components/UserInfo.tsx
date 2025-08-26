'use client';

import { useTransition } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { logoutAction } from '@/app/actions/auth';

export default function UserInfo() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 shadow-xl p-3 flex items-center gap-3">
        {/* Online Status */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            {/* Removed animate-ping for performance */}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 leading-none">Playing as</span>
            <span className="text-sm text-white font-medium">{user.username}</span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-8 w-px bg-slate-700"></div>
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center gap-2"
          title="Sign out and return to login"
        >
          <span>{isPending ? 'Signing out...' : 'Sign Out'}</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}