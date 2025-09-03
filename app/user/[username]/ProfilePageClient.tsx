"use client";

import { useState, useEffect } from "react";
import { User, Edit2, Info } from "lucide-react";
import UsernameChangeModal from "@/components/UsernameChangeModal";
import MiniBoard from "@/components/game/MiniBoard";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import type { User as AuthUser } from "@/types/auth";

interface GameRecord {
  id: string;
  whitePlayer: { username: string };
  blackPlayer: { username: string };
  result: string;
  resultReason: string | null;
  timeControl: string;
  moveCount: number | null;
  finalPosition: string | null;
  createdAt: string;
}

interface ProfileData {
  user: {
    id: string;
    username: string;
    createdAt: string;
    stats: {
      totalGames: number;
      wins: number;
      losses: number;
      draws: number;
    };
  };
  games: GameRecord[];
  hasMore: boolean;
}

interface ProfilePageClientProps {
  username: string;
  user: AuthUser | null | undefined;
  isOwnProfile: boolean;
  canChangeUsername: boolean;
}

export default function ProfilePageClient({
  username: initialUsername,
  user,
  isOwnProfile,
  canChangeUsername,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/profile/${username}?page=1`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found");
        } else {
          throw new Error("Failed to load profile");
        }
        return;
      }
      
      const data = await response.json();
      setProfileData(data);
      setPage(1);
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreGames = async () => {
    if (!profileData || loadingMore || !profileData.hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      
      const response = await fetch(`/api/profile/${username}?page=${nextPage}`);
      if (!response.ok) {
        throw new Error("Failed to load more games");
      }
      
      const data = await response.json();
      setProfileData(prev => ({
        ...prev!,
        games: [...prev!.games, ...data.games],
        hasMore: data.hasMore
      }));
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more games:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const viewGame = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    // The modal will handle signing out and redirecting
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-foreground-muted">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-background-tertiary text-foreground rounded hover:bg-background-secondary"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const { user: profileUser, games } = profileData;

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        {/* Profile Header */}
        <div className="bg-background-secondary rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-lichess-orange-400 to-lichess-orange-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profileUser.username}</h1>
                
                {/* Show provider info for own profile */}
                {isOwnProfile && user && (
                  <div className="mt-2 flex items-center gap-2">
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
            {isOwnProfile && canChangeUsername && (
              <button
                onClick={() => setIsUsernameModalOpen(true)}
                className="px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Change Username
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {profileUser.stats.totalGames}
              </div>
              <div className="text-foreground-muted text-sm">Total Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {profileUser.stats.wins}
              </div>
              <div className="text-foreground-muted text-sm">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {profileUser.stats.losses}
              </div>
              <div className="text-foreground-muted text-sm">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {profileUser.stats.draws}
              </div>
              <div className="text-foreground-muted text-sm">Draws</div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-foreground-muted">
            Member since {formatDistanceToNow(new Date(profileUser.createdAt), { addSuffix: true })}
          </div>
        </div>

        {/* Game History */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Game History</h2>
          
          {games.length === 0 ? (
            <div className="text-center text-foreground-muted py-8">
              No games played yet
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {games.map((game) => {
                  const isWhite = game.whitePlayer.username === username;
                  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
                  const gameResult = getGameResult(game.result, isWhite);
                  
                  return (
                    <div
                      key={game.id}
                      className="bg-background-tertiary rounded-lg p-4 hover:bg-background transition-colors cursor-pointer"
                      onClick={() => viewGame(game.id)}
                    >
                      <div className="flex gap-4">
                        {/* Mini Board */}
                        <div className="w-32 h-32 flex-shrink-0">
                          {game.finalPosition ? (
                            <MiniBoard 
                              fen={game.finalPosition}
                              orientation={isWhite ? "white" : "black"}
                            />
                          ) : (
                            <div className="w-full h-full bg-background-secondary rounded flex items-center justify-center">
                              <span className="text-foreground-muted text-xs">No board data</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Game Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-foreground">
                                vs {opponent.username}
                              </div>
                              <div className="text-sm text-foreground-muted">
                                {isWhite ? "Playing as White" : "Playing as Black"}
                              </div>
                            </div>
                            
                            <div className={`px-3 py-1 rounded text-sm font-semibold ${
                              gameResult === "win" ? "bg-green-500 text-white" :
                              gameResult === "loss" ? "bg-red-500 text-white" :
                              "bg-yellow-500 text-black"
                            }`}>
                              {gameResult === "win" ? "Won" :
                               gameResult === "loss" ? "Lost" : "Draw"}
                            </div>
                          </div>
                          
                          <div className="text-sm text-foreground-muted space-y-1">
                            <div>
                              {game.resultReason || "Game completed"} • {game.moveCount || 0} moves
                            </div>
                            <div>
                              Time control: {formatTimeControl(game.timeControl)}
                            </div>
                            <div>
                              Played {formatDistanceToNow(new Date(game.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Load More Button */}
              {profileData.hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMoreGames}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-lichess-orange-500 text-white rounded hover:bg-lichess-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? "Loading..." : "Load More Games"}
                  </button>
                </div>
              )}
            </>
          )}
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

function getGameResult(result: string, isWhite: boolean): "win" | "loss" | "draw" {
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return isWhite ? "win" : "loss";
  if (result === "0-1") return isWhite ? "loss" : "win";
  return "draw";
}

function formatTimeControl(timeControl: string): string {
  if (timeControl === "unlimited") return "Unlimited";
  
  const match = timeControl.match(/(\d+)\+(\d+)/);
  if (!match) return timeControl;
  
  const [, initial, increment] = match;
  const minutes = Math.floor(parseInt(initial) / 60);
  const incrementSec = parseInt(increment);
  
  if (minutes > 0 && incrementSec > 0) {
    return `${minutes}+${incrementSec}`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return `${initial} sec`;
  }
}