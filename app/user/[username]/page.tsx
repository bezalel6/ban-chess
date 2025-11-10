import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";
import ProfilePageClient from "./ProfilePageClient";

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

  // Pass data to client component for interactivity
  return (
    <ProfilePageClient
      username={username}
      user={user}
      isOwnProfile={isOwnProfile}
    />
  );
}
