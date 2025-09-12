"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/lib/toast/toast-context";

interface SignInPanelProps {
  compact?: boolean;
  onSignIn?: () => void;
}

export default function SignInPanel({
  compact = false,
  onSignIn,
}: SignInPanelProps) {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // Check for auth errors in URL params
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      console.log("[SignInPanel] Auth error:", error); // Dev logging
      
      // Handle specific errors with appropriate messages
      if (error === "OAuthCreateAccount") {
        // Check if it's an email requirement issue (Lichess without email)
        // or a duplicate email issue
        showToast(
          "Authentication failed. If you're using Lichess, you must grant email access or sign in as a Guest.",
          "error",
          7000
        );
        
        setTimeout(() => {
          showToast(
            "Lichess users: Enable email access in your Lichess account or use Guest mode to play.",
            "info",
            10000
          );
        }, 1500);
      } else if (error === "OAuthAccountNotLinked") {
        // This occurs when email is already registered with a different provider
        showToast(
          "This email is already registered. Please sign in with the provider you originally used.",
          "error",
          7000
        );
        
        // Add helpful suggestions without revealing the specific provider
        setTimeout(() => {
          showToast(
            "Try signing in with Google, Lichess, or as a Guest if you're not sure.",
            "info",
            10000
          );
        }, 1500);
      } else if (error === "OAuthSignin" || error === "OAuthCallback") {
        // OAuth provider errors
        showToast(
          "Authentication failed. Please try again or use a different sign-in method.",
          "error"
        );
      } else {
        // Generic error for other cases
        showToast(
          "Authentication failed. Please check your credentials and try again.",
          "error"
        );
      }
    }
  }, [searchParams, showToast]);

  const handleLichessSignIn = () => {
    signIn("lichess", { callbackUrl: "/" });
    onSignIn?.();
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
    onSignIn?.();
  };

  // Guest sign-in is no longer needed - users are automatically anonymous

  if (compact) {
    // Improved compact layout with better spacing and usability
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleLichessSignIn}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-black rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow-md group"
          >
            <Image
              src="/icons/lichess-logo.png"
              alt="Lichess"
              width={24}
              height={24}
              className="object-contain group-hover:scale-110 transition-transform"
            />
            <span className="font-medium">Sign in with Lichess</span>
          </button>

          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-black rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow-md group"
          >
            <svg
              width="24"
              height="24"
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
            <span className="font-medium">Sign in with Google</span>
          </button>
        </div>

      </div>
    );
  }

  // Full layout (same as signin page)
  return (
    <div className="space-y-6">
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

    </div>
  );
}
