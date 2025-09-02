"use client";

import SignInPanel from "@/components/SignInPanel";
import Image from "next/image";

export default function SignInPage() {
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
            Welcome to <span className="text-lichess-orange-500">Ban</span>
            <span className="text-foreground">Chess</span>
          </h2>
          <p className="mt-2 text-muted-foreground text-lg">
            Choose how you want to play
          </p>
        </div>

        {/* Use the shared SignInPanel component */}
        <SignInPanel />

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
