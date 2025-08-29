import { User } from 'lucide-react';
import { withAuth } from '@/components/auth/withAuth';
import type { AuthSession } from '@/types/auth';
import SignOutButton from '@/components/auth/SignOutButton';

interface SettingsPageProps {
  session: AuthSession;
}

function SettingsPage({ session }: SettingsPageProps) {
  const { user } = session;
  const isGuest = user.provider === 'guest';

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
        <SignOutButton />
      </div>
    </div>
  );
}

// Export the page wrapped with authentication
export default withAuth(SettingsPage, { 
  allowGuest: true // Allow guests to view settings but with limited options
});