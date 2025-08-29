'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const handleLichessSignIn = () => {
    signIn('lichess', { callbackUrl: '/' });
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  const handleGuestSignIn = async () => {
    try {
      const result = await signIn('guest', { 
        redirect: false,
        guest: 'true'
      });
      
      if (result?.ok) {
        window.location.href = '/';
      } else {
        console.error('Guest sign-in failed:', result?.error);
      }
    } catch (error) {
      console.error('Guest sign-in error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Welcome to 2 Ban 2 Chess</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to start playing
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLichessSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 50 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25 0C11.193 0 0 11.193 0 25s11.193 25 25 25 25-11.193 25-25S38.807 0 25 0zm11.083 13.333l-3.125 14.583-4.166-4.166-4.167 8.333-4.167-4.166-8.333 8.333-4.167-4.167 8.334-8.333-4.167-4.167 8.333-4.166-4.166-4.167 14.583-3.125 3.125 3.125z"
                fill="currentColor"
              />
            </svg>
            Sign in with Lichess
          </button>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium border border-gray-300"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          <button
            onClick={handleGuestSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-background-secondary text-foreground rounded-lg hover:bg-background-tertiary transition-colors font-medium border border-border"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 3.5C14.1 3.1 13.1 3.1 12.2 3.5L6 7V9H7V20C7 21.1 7.9 22 9 22V24H15V22C16.1 22 17 21.1 17 20V9H21Z"
                fill="currentColor"
              />
            </svg>
            Continue as Guest
          </button>

        </div>

        <div className="pt-6 border-t border-border">
          <div className="text-xs text-center text-muted-foreground">
            By signing in, you agree to authenticate with your chosen provider.
            We only access your username and basic profile information.
          </div>
        </div>
      </div>
    </div>
  );
}