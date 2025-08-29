"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLichessSignIn = () => {
    signIn("lichess", { callbackUrl: "/" });
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const handleGuestSignIn = () => {
    setIsLoading(true);
    // Use NextAuth's built-in redirect - cleaner and more direct
    signIn("guest", { callbackUrl: "/" });
  };

  // Show loading state during guest authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Welcome to <span className="text-lichess-orange-500">Ban</span><span className="text-foreground">Chess</span></h2>
          <div className="loading-spinner mb-6"></div>
          <p className="text-muted-foreground">Signing you in as guest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-8">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="BanChess"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h2 className="text-4xl font-bold">
            Welcome to <span className="text-lichess-orange-500">Ban</span><span className="text-foreground">Chess</span>
          </h2>
          <p className="mt-2 text-muted-foreground text-lg">Choose how you want to play</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleLichessSignIn}
            className="aspect-square flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-gray-50 to-gray-100 text-black rounded-2xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow-lg group"
          >
            <Image
              src="/icons/lichess-logo.png"
              alt="Lichess"
              width={48}
              height={48}
              className="object-contain group-hover:scale-110 transition-transform"
            />
            <span className="font-medium text-sm">Lichess</span>
          </button>

          <button
            onClick={handleGoogleSignIn}
            className="aspect-square flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-gray-50 to-gray-100 text-black rounded-2xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow-lg group"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="group-hover:scale-110 transition-transform"
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
            <span className="font-medium text-sm">Google</span>
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">Or continue without account</span>
          </div>
        </div>

        <button
          onClick={handleGuestSignIn}
          className="w-full flex items-center justify-center gap-4 py-6 px-6 bg-background-secondary text-foreground rounded-2xl hover:bg-background-tertiary transition-all duration-200 font-medium text-lg border-2 border-border hover:border-lichess-orange-500/30 shadow-sm hover:shadow-lg group"
        >
          <Image
            src="/icons/pawn.webp"
            alt="Pawn"
            width={40}
            height={40}
            className="object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all"
          />
          <span>Play as Guest</span>
        </button>

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
