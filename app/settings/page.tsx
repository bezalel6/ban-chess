'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (!user) {
    router.push('/');
    return null;
  }

  const isGuest = user.username?.startsWith('Guest_');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Section */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-lichess-orange-500" />
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Username</p>
            <p className="text-sm text-foreground-muted">{user.username || 'Unknown'}</p>
          </div>
          <div>
            <p className="font-medium">Account Type</p>
            <p className="text-sm text-foreground-muted">
              {isGuest ? 'Guest Account' : 'Registered'}
            </p>
          </div>
          {isGuest && (
            <div className="mt-4 p-4 bg-lichess-orange-500/10 rounded-lg">
              <p className="text-sm text-foreground-muted mb-3">
                Guest accounts are temporary. Sign in to save your games and preferences.
              </p>
              <a
                href="/auth/signin"
                className="inline-block px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors text-sm"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">More Settings Coming Soon</h2>
        <p className="text-foreground-muted">
          We&apos;re working on adding more customization options including:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
          <li>• Board themes and piece sets</li>
          <li>• Sound preferences</li>
          <li>• Game notifications</li>
          <li>• Privacy controls</li>
        </ul>
      </div>

      {/* Sign Out Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}