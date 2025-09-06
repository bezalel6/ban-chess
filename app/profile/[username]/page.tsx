"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import LazyGameThumbnail from "@/components/game/LazyGameThumbnail";
import { formatDistanceToNow } from "date-fns";

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

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const { user, games } = profileData;
  const isOwnProfile = session?.user?.name === username;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">{user.username}</h1>
          {isOwnProfile && (
            <span className="text-sm text-gray-400">Your Profile</span>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {user.stats.totalGames}
            </div>
            <div className="text-gray-400 text-sm">Total Games</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {user.stats.wins}
            </div>
            <div className="text-gray-400 text-sm">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {user.stats.losses}
            </div>
            <div className="text-gray-400 text-sm">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {user.stats.draws}
            </div>
            <div className="text-gray-400 text-sm">Draws</div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-400">
          Member since {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
        </div>
      </div>

      {/* Game History */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Game History</h2>
        
        {games.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No games played yet
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => {
                const isWhite = game.whitePlayer.username === username;
                const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
                const gameResult = getGameResult(game.result, isWhite);
                
                return (
                  <div
                    key={game.id}
                    className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-650 transition-all hover:shadow-xl cursor-pointer"
                    onClick={() => viewGame(game.id)}
                  >
                    {/* Game Thumbnail */}
                    <div className="aspect-square">
                      {game.finalPosition ? (
                        <LazyGameThumbnail
                          fen={game.finalPosition}
                          orientation={isWhite ? "white" : "black"}
                          result={game.result}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-400">No board data</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Game Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-white text-lg">
                            vs {opponent.username}
                          </div>
                          <div className="text-sm text-gray-400">
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
                      
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>
                          {game.resultReason || "Game completed"} • {game.moveCount || 0} moves
                        </div>
                        <div>
                          Time control: {formatTimeControl(game.timeControl)}
                        </div>
                        <div>
                          {formatDistanceToNow(new Date(game.createdAt), { addSuffix: true })}
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
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Load More Games"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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