/**
 * Example components showing different authentication patterns
 * These demonstrate how to use withAuth HOC for various scenarios
 */

import { withAuth, createAuthenticatedComponent } from './withAuth';
import type { AuthSession } from '@/types/auth';

// ============================================
// Example 1: Basic Protected Page
// Only authenticated users can access
// ============================================
interface ProtectedPageProps {
  session: AuthSession;
}

function ProtectedPage({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Welcome, {session.user.username}!</h1>
      <p>This page is only visible to authenticated users.</p>
    </div>
  );
}

export const BasicProtectedPage = withAuth(ProtectedPage);

// ============================================
// Example 2: Guest-Accessible Page
// Both guests and registered users can access
// ============================================
function GuestFriendlyPage({ session }: ProtectedPageProps) {
  const isGuest = session.user.provider === 'guest';

  return (
    <div>
      <h1>Welcome, {session.user.username}!</h1>
      {isGuest ? (
        <p>You&apos;re using a guest account. Sign in to save your progress!</p>
      ) : (
        <p>Thanks for being a registered user!</p>
      )}
    </div>
  );
}

export const GuestAccessiblePage = withAuth(GuestFriendlyPage, {
  allowGuest: true,
});

// ============================================
// Example 3: Provider-Specific Page
// Only users from specific providers can access
// ============================================
function GoogleOnlyPage({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Google Users Only</h1>
      <p>Welcome, {session.user.username}!</p>
      <p>This exclusive content is only for Google-authenticated users.</p>
    </div>
  );
}

export const GoogleExclusivePage = withAuth(GoogleOnlyPage, {
  requiredProviders: ['google'],
  redirectTo: '/auth/provider-required',
});

// ============================================
// Example 4: Custom Authorization Logic
// Uses custom function to determine access
// ============================================
function AdminPage({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, Admin {session.user.username}!</p>
      <p>Only specific users can see this.</p>
    </div>
  );
}

export const AdminOnlyPage = withAuth(AdminPage, {
  authorize: async session => {
    // Example: Check if user is in admin list
    const adminUsernames = ['admin', 'superuser'];
    return adminUsernames.includes(session.user.username);
  },
  redirectTo: '/unauthorized',
});

// ============================================
// Example 5: Fallback Component
// Shows different content instead of redirecting
// ============================================
function PremiumContent({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Premium Features</h1>
      <p>Exclusive content for {session.user.username}</p>
    </div>
  );
}

function UpgradePrompt() {
  return (
    <div>
      <h1>Upgrade Required</h1>
      <p>This content requires a premium account.</p>
      <button>Upgrade Now</button>
    </div>
  );
}

export const PremiumPage = withAuth(PremiumContent, {
  authorize: async session => {
    // Check if user has premium access (example logic)
    return session.user.provider !== 'guest';
  },
  fallback: UpgradePrompt,
});

// ============================================
// Example 6: Conditional Component
// Different components for auth/unauth states
// ============================================
function AuthenticatedDashboard({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Your Dashboard</h1>
      <p>Welcome back, {session.user.username}!</p>
      <ul>
        <li>Your games</li>
        <li>Statistics</li>
        <li>Settings</li>
      </ul>
    </div>
  );
}

function PublicLanding() {
  return (
    <div>
      <h1>Welcome to 2Ban 2Chess</h1>
      <p>Please sign in to access your dashboard.</p>
      <button>Sign In</button>
    </div>
  );
}

export const ConditionalDashboard = createAuthenticatedComponent(
  AuthenticatedDashboard,
  PublicLanding,
  { allowGuest: false }
);

// ============================================
// Example 7: Multi-Provider Support
// Allow multiple specific providers
// ============================================
function SocialUsersPage({ session }: ProtectedPageProps) {
  return (
    <div>
      <h1>Social Network Users</h1>
      <p>
        Welcome {session.user.username} from {session.user.provider}!
      </p>
      <p>This page is for users authenticated via social providers.</p>
    </div>
  );
}

export const SocialOnlyPage = withAuth(SocialUsersPage, {
  requiredProviders: ['google', 'lichess'],
  fallback: () => (
    <div>
      <h1>Social Login Required</h1>
      <p>Please sign in with Google or Lichess to access this content.</p>
    </div>
  ),
});
