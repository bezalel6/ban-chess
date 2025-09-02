"use client";

import { useState } from "react";
import {
  Trophy,
  Clock,
  TrendingUp,
  Shield,
  User,
  ChevronRight,
  Edit2,
  Info,
} from "lucide-react";
import UsernameChangeModal from "@/components/UsernameChangeModal";
import type { User as AuthUser } from "@/types/auth";
import { useRouter } from "next/navigation";

interface GameRecord {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  playerColor: "white" | "black";
  duration: string;
  date: string;
}

interface ProfilePageClientProps {
  username: string;
  user: AuthUser | null | undefined;
  isOwnProfile: boolean;
  canChangeUsername: boolean;
  stats: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    currentStreak: number;
  };
  recentGames: GameRecord[];
}

export default function ProfilePageClient({
  username: initialUsername,
  user,
  isOwnProfile,
  canChangeUsername,
  stats,
  recentGames,
}: ProfilePageClientProps) {
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const router = useRouter();

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    // Optionally refresh the page or update the URL
    router.push(`/user/${newUsername}`);
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "win":
        return "text-green-500";
      case "loss":
        return "text-red-500";
      case "draw":
        return "text-yellow-500";
      default:
        return "text-foreground";
    }
  };

  const getResultSymbol = (result: string) => {
    switch (result) {
      case "win":
        return "+1";
      case "loss":
        return "-1";
      case "draw":
        return "½";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Clean Profile Header */}
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-lichess-orange-400 to-lichess-orange-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {username}
                  {stats.rating >= 1500 && (
                    <span title="Established Player">
                      <Shield className="h-5 w-5 text-lichess-orange-500" />
                    </span>
                  )}
                </h1>
                <p className="text-sm text-foreground-muted">
                  Rating: <span className="font-semibold">{stats.rating}</span>
                </p>

                {/* Show provider info for own profile */}
                {isOwnProfile && user && (
                  <div className="mt-1 flex items-center gap-2">
                    <Info className="h-3 w-3 text-foreground-muted" />
                    <p className="text-xs text-foreground-muted">
                      {user.provider === "lichess" && user.originalUsername && (
                        <>Signed in via Lichess as {user.originalUsername}</>
                      )}
                      {user.provider === "google" && user.originalName && (
                        <>Signed in via Google as {user.originalName}</>
                      )}
                      {user.provider === "guest" && <>Guest account</>}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons for own profile */}
            {isOwnProfile && (
              <div className="flex gap-2">
                {canChangeUsername && (
                  <button
                    onClick={() => setIsUsernameModalOpen(true)}
                    className="px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Change Username
                  </button>
                )}
                <button className="px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors">
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Simplified Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
              <div className="text-xs text-foreground-muted">Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {stats.wins}
              </div>
              <div className="text-xs text-foreground-muted">Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {stats.losses}
              </div>
              <div className="text-xs text-foreground-muted">Losses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lichess-orange-500">
                {stats.winRate}%
              </div>
              <div className="text-xs text-foreground-muted">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Recent Games - Clean List */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-lichess-orange-500" />
            Recent Games
          </h2>

          <div className="space-y-2">
            {recentGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded ${
                      game.playerColor === "white"
                        ? "bg-white border"
                        : "bg-gray-700"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">vs {game.opponent}</span>
                      <span
                        className={`font-bold ${getResultColor(game.result)}`}
                      >
                        {getResultSymbol(game.result)}
                      </span>
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {game.duration} • {game.date}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-foreground-muted" />
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-2 text-sm text-lichess-orange-500 hover:text-lichess-orange-400 transition-colors">
            View all games
          </button>
        </div>

        {/* Current Performance */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-lichess-orange-500" />
            Current Performance
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-foreground-muted mb-2">Win Streak</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-500">
                  {stats.currentStreak}
                </span>
                <span className="text-sm text-foreground-muted">games</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-foreground-muted mb-2">Rating Trend</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-lichess-orange-500">
                  ↑
                </span>
                <span className="text-sm text-foreground-muted">Improving</span>
              </div>
            </div>
          </div>

          {/* Simple Win Rate Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-muted">Win Rate</span>
              <span className="font-medium">{stats.winRate}%</span>
            </div>
            <div className="bg-background-tertiary rounded-full h-3">
              <div
                className="bg-gradient-to-r from-lichess-orange-400 to-lichess-orange-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-lichess-orange-500" />
            Achievements
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-xs font-medium">First Win</p>
            </div>
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-xs font-medium">100 Games</p>
            </div>
            <div className="text-center p-4 bg-background-tertiary rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-xs font-medium">Rising Star</p>
            </div>
          </div>
        </div>
      </div>

      {/* Username Change Modal */}
      {canChangeUsername && user && (
        <UsernameChangeModal
          isOpen={isUsernameModalOpen}
          onClose={() => setIsUsernameModalOpen(false)}
          currentUsername={username}
          provider={user.provider}
          originalName={user.originalUsername || user.originalName}
          onSuccess={handleUsernameChange}
        />
      )}
    </>
  );
}
