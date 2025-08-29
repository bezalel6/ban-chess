'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Palette, Shield, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      gameInvites: true,
      gameReminders: true,
      achievements: false,
    },
    display: {
      boardTheme: 'classic',
      pieceSet: 'standard',
      showHints: true,
      soundEnabled: true,
    },
    privacy: {
      profilePublic: true,
      showOnlineStatus: true,
      allowChallenges: true,
    },
  });

  const handleToggle = (category: string, setting: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: !prev[category as keyof typeof prev][setting as keyof typeof prev[typeof category]],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // In production, this would save to an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (!user) {
    router.push('/');
    return null;
  }

  const isGuest = !user?.userId;

  // Simplified settings for guest users
  if (isGuest) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Guest Account Notice */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-lichess-orange-500" />
            Guest Account
          </h2>
          <p className="text-foreground-muted mb-4">
            You&apos;re playing as a guest. Sign in to save your preferences and track your games.
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors"
          >
            Sign In to Save Settings
          </a>
        </div>

        {/* Basic Display Settings for Guests */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-lichess-orange-500" />
            Display
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Sound Effects</p>
                <p className="text-sm text-foreground-muted">Play sounds for moves</p>
              </div>
              <input
                type="checkbox"
                checked={settings.display.soundEnabled}
                onChange={() => handleToggle('display', 'soundEnabled')}
                className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
              />
            </label>
          </div>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Username</p>
              <p className="text-sm text-foreground-muted">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-sm text-foreground-muted">Registered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-lichess-orange-500" />
          Notifications
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Game Invites</p>
              <p className="text-sm text-foreground-muted">Get notified when someone challenges you</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.gameInvites}
              onChange={() => handleToggle('notifications', 'gameInvites')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Game Reminders</p>
              <p className="text-sm text-foreground-muted">Remind when it&apos;s your turn</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.gameReminders}
              onChange={() => handleToggle('notifications', 'gameReminders')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-lichess-orange-500" />
          Display
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Show Hints</p>
              <p className="text-sm text-foreground-muted">Display move suggestions</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.showHints}
              onChange={() => handleToggle('display', 'showHints')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Sound Effects</p>
              <p className="text-sm text-foreground-muted">Play sounds for moves and notifications</p>
            </div>
            <input
              type="checkbox"
              checked={settings.display.soundEnabled}
              onChange={() => handleToggle('display', 'soundEnabled')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-lichess-orange-500" />
          Privacy
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Public Profile</p>
              <p className="text-sm text-foreground-muted">Allow others to view your profile</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.profilePublic}
              onChange={() => handleToggle('privacy', 'profilePublic')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Online Status</p>
              <p className="text-sm text-foreground-muted">Show when you&apos;re online</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.showOnlineStatus}
              onChange={() => handleToggle('privacy', 'showOnlineStatus')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Accept Challenges</p>
              <p className="text-sm text-foreground-muted">Allow other players to challenge you</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.allowChallenges}
              onChange={() => handleToggle('privacy', 'allowChallenges')}
              className="w-5 h-5 rounded border-border bg-background text-lichess-orange-500 focus:ring-lichess-orange-500"
            />
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-lichess-orange-500 text-white hover:bg-lichess-orange-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}