"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GameMode } from "@/lib/game-types";

interface GameModeCardProps {
  mode: GameMode;
  title: string;
  description: string;
  icon: string;
  requiresAuth: boolean;
  isAuthenticated: boolean;
  onSelect: (mode: GameMode) => void;
}

function GameModeCard({
  mode,
  title,
  description,
  icon,
  requiresAuth,
  isAuthenticated,
  onSelect,
}: GameModeCardProps) {
  const disabled = requiresAuth && !isAuthenticated;

  return (
    <div className="bg-background-secondary rounded-lg p-6 shadow-lg border border-border hover:border-primary/50 transition-all">
      <div className="text-4xl mb-4 text-center">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-foreground-muted mb-6">{description}</p>

      <button
        onClick={() => onSelect(mode)}
        disabled={disabled}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
          disabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : mode === GameMode.OFFLINE
            ? "bg-lichess-green-500 hover:bg-lichess-green-600 text-white"
            : mode === GameMode.SOLO
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white"
        }`}
      >
        {disabled ? "Sign in required" : title}
      </button>
      
      {requiresAuth && !isAuthenticated && (
        <p className="text-xs text-foreground-muted text-center mt-2">
          Requires account
        </p>
      )}
    </div>
  );
}

export default function PlayPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleModeSelect = (mode: GameMode) => {
    // Navigate to the appropriate route
    switch (mode) {
      case GameMode.OFFLINE:
        router.push("/play/practice");
        break;
      case GameMode.SOLO:
        router.push("/play/solo");
        break;
      case GameMode.ONLINE:
        router.push("/play/online");
        break;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background-secondary">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Choose Your Game Mode
          </h1>
          <p className="text-foreground-muted">
            Select how you want to play ban chess
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <GameModeCard
            mode={GameMode.OFFLINE}
            title="Practice"
            description="Play both sides locally. No server required."
            icon="🎯"
            requiresAuth={false}
            isAuthenticated={!!user}
            onSelect={handleModeSelect}
          />

          <GameModeCard
            mode={GameMode.ONLINE}
            title="Find Opponent"
            description="Play against real players online."
            icon="🌐"
            requiresAuth={true}
            isAuthenticated={!!user}
            onSelect={handleModeSelect}
          />
        </div>
        
        {/* Solo mode as a less prominent option */}
        <details className="mt-6 max-w-2xl mx-auto">
          <summary className="cursor-pointer text-sm text-foreground-muted hover:text-foreground transition-colors text-center">
            Test server mode
          </summary>
          <div className="mt-4 max-w-md mx-auto">
            <GameModeCard
              mode={GameMode.SOLO}
              title="Practice Online"
              description="Test the full game flow with the server. Play both sides online."
              icon="🧪"
              requiresAuth={true}
              isAuthenticated={!!user}
              onSelect={handleModeSelect}
            />
          </div>
        </details>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}