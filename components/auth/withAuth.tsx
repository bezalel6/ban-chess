import { ComponentType } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { AuthSession, AuthProvider } from '@/types/auth';

export interface WithAuthOptions {
  /**
   * Where to redirect if authentication fails
   * @default '/auth/signin'
   */
  redirectTo?: string;

  /**
   * Whether to allow guest users
   * @default false
   */
  allowGuest?: boolean;

  /**
   * Required authentication providers
   * If specified, only users authenticated with these providers can access
   */
  requiredProviders?: AuthProvider[];

  /**
   * Custom authorization logic
   * Return true to allow access, false to deny
   */
  authorize?: (session: AuthSession) => boolean | Promise<boolean>;

  /**
   * Component to render if unauthorized (instead of redirecting)
   */
  fallback?: ComponentType<{ session?: AuthSession }>;
}

/**
 * Higher-order component for protecting pages with authentication
 *
 * @example
 * ```tsx
 * // Basic protection - redirect to signin if not authenticated
 * export default withAuth(SettingsPage);
 *
 * // Allow guest users
 * export default withAuth(SettingsPage, { allowGuest: true });
 *
 * // Require specific providers
 * export default withAuth(AdminPage, {
 *   requiredProviders: ['google'],
 *   redirectTo: '/unauthorized'
 * });
 *
 * // Custom authorization logic
 * export default withAuth(PremiumPage, {
 *   authorize: (session) => session.user.username === 'admin',
 *   fallback: UpgradePrompt
 * });
 * ```
 */
export function withAuth<P extends object>(
  Component: ComponentType<P & { session: AuthSession }>,
  options: WithAuthOptions = {}
): ComponentType<P> {
  const {
    redirectTo = '/auth/signin',
    allowGuest = false,
    requiredProviders,
    authorize,
    fallback: FallbackComponent,
  } = options;

  return async function AuthenticatedComponent(props: P) {
    const session = (await getServerSession(authOptions)) as AuthSession | null;

    // Check if user is authenticated
    if (!session) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      redirect(redirectTo);
    }

    // Check if guest users are allowed
    const isGuest = session.user.provider === 'guest';

    if (isGuest && !allowGuest) {
      if (FallbackComponent) {
        return <FallbackComponent session={session} />;
      }
      redirect(redirectTo);
    }

    // Check required providers
    if (requiredProviders && requiredProviders.length > 0) {
      const userProvider = session.user.provider;
      if (!requiredProviders.includes(userProvider)) {
        if (FallbackComponent) {
          return <FallbackComponent session={session} />;
        }
        redirect(redirectTo);
      }
    }

    // Run custom authorization logic
    if (authorize) {
      const isAuthorized = await authorize(session);
      if (!isAuthorized) {
        if (FallbackComponent) {
          return <FallbackComponent session={session} />;
        }
        redirect(redirectTo);
      }
    }

    // All checks passed, render the component with session prop
    return <Component {...props} session={session} />;
  };
}

/**
 * Hook for conditional rendering based on authentication
 * Returns a component that renders different content based on auth state
 */
export function createAuthenticatedComponent<P extends object>(
  AuthenticatedComponent: ComponentType<P & { session: AuthSession }>,
  UnauthenticatedComponent?: ComponentType<P>,
  options: WithAuthOptions = {}
): ComponentType<P> {
  return async function ConditionalAuthComponent(props: P) {
    const session = (await getServerSession(authOptions)) as AuthSession | null;

    if (!session) {
      return UnauthenticatedComponent ? (
        <UnauthenticatedComponent {...props} />
      ) : null;
    }

    // Check guest status
    if (session.user.provider === 'guest' && !options.allowGuest) {
      return UnauthenticatedComponent ? (
        <UnauthenticatedComponent {...props} />
      ) : null;
    }

    // Check required providers
    if (
      options.requiredProviders &&
      !options.requiredProviders.includes(session.user.provider)
    ) {
      return UnauthenticatedComponent ? (
        <UnauthenticatedComponent {...props} />
      ) : null;
    }

    // Check custom authorization
    if (options.authorize) {
      const isAuthorized = await options.authorize(session);
      if (!isAuthorized) {
        return UnauthenticatedComponent ? (
          <UnauthenticatedComponent {...props} />
        ) : null;
      }
    }

    return <AuthenticatedComponent {...props} session={session} />;
  };
}
