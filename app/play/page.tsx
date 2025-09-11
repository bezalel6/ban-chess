"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GameMode } from "@/lib/game-types";

interface GameModeCardProps {
  mode: GameMode;
  title: string;
  description: string;
  icon: string;
  features: string[];
  requiresAuth: boolean;
  isAuthenticated: boolean;
  onSelect: (mode: GameMode) => void;
}

function GameModeCard({
  mode,
  title,
  description,
  icon,
  features,
  requiresAuth,
  isAuthenticated,
  onSelect,
}: GameModeCardProps) {
  const disabled = requiresAuth && !isAuthenticated;

  return (
    <div className="bg-background-secondary rounded-lg p-6 shadow-lg border border-border hover:border-primary/50 transition-all">
      <div className="text-4xl mb-4 text-center">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-foreground-muted mb-4">{description}</p>
      
      <ul className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <span className="text-lichess-green-500 mr-2">✓</span>
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

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
        {disabled ? "Sign in required" : "Play " + title}
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
        router.push("/play/offline");
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

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <GameModeCard
            mode={GameMode.OFFLINE}
            title="Offline Practice"
            description="Learn ban chess without any server connection"
            icon="🎯"
            features={[
              "No internet required",
              "Instant play",
              "Undo moves",
              "No time pressure",
              "Perfect for learning",
            ]}
            requiresAuth={false}
            isAuthenticated={!!user}
            onSelect={handleModeSelect}
          />

          <GameModeCard
            mode={GameMode.SOLO}
            title="Solo Practice"
            description="Practice with full game features and tracking"
            icon="🏋️"
            features={[
              "Saved to game history",
              "Time controls",
              "Track your progress",
              "Full rule enforcement",
              "Server validation",
            ]}
            requiresAuth={true}
            isAuthenticated={!!user}
            onSelect={handleModeSelect}
          />

          <GameModeCard
            mode={GameMode.ONLINE}
            title="Online Match"
            description="Compete against other players in real-time"
            icon="🌐"
            features={[
              "Real opponents",
              "Matchmaking system",
              "Competitive play",
              "Live game updates",
              "Spectator support",
            ]}
            requiresAuth={true}
            isAuthenticated={!!user}
            onSelect={handleModeSelect}
          />
        </div>

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