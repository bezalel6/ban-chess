'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  className?: string;
  showIcon?: boolean;
  redirectTo?: string;
}

export default function SignOutButton({ 
  className = "px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2",
  showIcon = true,
  redirectTo = '/'
}: SignOutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: redirectTo });
  };

  return (
    <button
      onClick={handleSignOut}
      className={className}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign Out
    </button>
  );
}