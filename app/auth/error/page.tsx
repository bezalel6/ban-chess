'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Check if all environment variables are set correctly.';
      case 'AccessDenied':
        return 'You have denied access to your account.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'OAuthSignin':
        return 'Error occurred while signing in with OAuth provider.';
      case 'OAuthCallback':
        return 'Error occurred while handling OAuth callback.';
      case 'OAuthCreateAccount':
        return 'Could not create account with OAuth provider.';
      case 'EmailCreateAccount':
        return 'Could not create account with email provider.';
      case 'Callback':
        return 'Error occurred in the OAuth callback handler.';
      case 'OAuthAccountNotLinked':
        return 'This account is already linked to another user.';
      case 'EmailSignin':
        return 'The email could not be sent.';
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return 'An unexpected error occurred during authentication.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-background-secondary rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
          <p className="text-foreground-muted mb-6">
            {getErrorMessage()}
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-background border border-border rounded-lg hover:bg-background-tertiary transition-all"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}