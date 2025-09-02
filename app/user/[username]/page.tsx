import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";
import ProfilePageClient from "./ProfilePageClient";

interface GameRecord {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  playerColor: "white" | "black";
  duration: string;
  date: string;
}

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const resolvedParams = await params;
  const username = resolvedParams.username;
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  const user = session?.user;

  // Don't show profiles for guest usernames
  if (username.toLowerCase().startsWith("guest")) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-secondary rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Guest Profile</h1>
          <p className="text-foreground-muted mb-6">
            Guest accounts don&apos;t have profiles. Sign in with Lichess or
            Google to track your games and stats!
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Guest users don't have profiles
  const isGuest = user?.provider === "guest";
  const isOwnProfile = user?.username === username && !isGuest;
  const canChangeUsername = isOwnProfile && user?.provider !== "guest";

  // Mock data - in production this would come from an API
  // Generate pseudo-random but consistent stats based on username
  const userHash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gamesPlayed = 50 + (userHash % 200);
  const wins = Math.floor(gamesPlayed * (0.4 + (userHash % 30) / 100));
  const losses = Math.floor(gamesPlayed * (0.35 + ((userHash * 7) % 20) / 100));
  const draws = gamesPlayed - wins - losses;
  
  const stats = {
    rating: 1200 + (userHash % 600), // Rating between 1200-1800
    gamesPlayed,
    wins,
    losses,
    draws,
    winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
    currentStreak: (userHash % 7) - 3, // Streak between -3 and 3
  };

  // Mock data - in production this would come from an API
  const recentGames: GameRecord[] = [
    {
      id: "1",
      opponent: "DragonMaster",
      result: "win",
      playerColor: "white",
      duration: "15:23",
      date: "2 hours ago",
    },
    {
      id: "2",
      opponent: "ChessWizard99",
      result: "loss",
      playerColor: "black",
      duration: "08:45",
      date: "5 hours ago",
    },
    {
      id: "3",
      opponent: "TacticalGenius",
      result: "draw",
      playerColor: "white",
      duration: "22:10",
      date: "Yesterday",
    },
  ];

  // Pass data to client component for interactivity
  return (
    <ProfilePageClient
      username={username}
      user={user}
      isOwnProfile={isOwnProfile}
      canChangeUsername={canChangeUsername}
      stats={stats}
      recentGames={recentGames}
    />
  );
}
