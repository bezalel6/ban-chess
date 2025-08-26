"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQueue } from "@/lib/ws-client";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { position, matched, error, connected, authenticated, joinQueue, leaveQueue } = 
    useQueue(user ? { userId: user.userId, username: user.username } : undefined);

  useEffect(() => {
    if (matched) {
      // Redirect to game when matched
      router.push(`/game/${matched.gameId}`);
    }
  }, [matched, router]);

  const handleJoinQueue = () => {
    if (!isAuthenticated || !user) {
      return;
    }
    joinQueue();
  };

  const inQueue = position !== null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Hero Section - All content in one cohesive block */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl p-8 md:p-12">
            
            {/* Title Section */}
            <div className="text-center mb-8">
              <div className="text-7xl mb-4 animate-pulse">♟️</div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Ban Chess Web
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A strategic chess variant where you can ban your opponent's moves
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-8"></div>

            {/* Queue Section */}
            <div className="mb-8">
              {!inQueue ? (
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-white mb-6">
                    Ready to Play?
                  </h2>
                  <button
                    onClick={handleJoinQueue}
                    disabled={!isAuthenticated || !connected || !authenticated}
                    className="px-12 py-4 text-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                  >
                    {!isAuthenticated ? "Login Required" : 
                     !connected ? "Connecting..." :
                     !authenticated ? "Authenticating..." :
                     "Join Queue"}
                  </button>
                  {!isAuthenticated && (
                    <p className="text-sm text-gray-500 mt-4">
                      Please set your username to start playing
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-white mb-6">
                    Finding Opponent...
                  </h2>
                  <div className="mb-6">
                    <div className="loading-spinner mb-4" />
                    <p className="text-lg text-gray-300">
                      Position in queue: <span className="font-bold text-white">{position}</span>
                    </p>
                    {matched && (
                      <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <p className="text-green-400 font-semibold">
                          Matched! Playing as {matched.color}
                          {matched.opponent && ` against ${matched.opponent}`}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={leaveQueue}
                    className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
                  >
                    Leave Queue
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-8"></div>

            {/* How to Play Section - Inside the same container */}
            <div>
              <h3 className="text-2xl font-semibold text-white text-center mb-6">
                How to Play
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">1</span>
                    <p className="text-gray-300">Black bans one of White's opening moves</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">2</span>
                    <p className="text-gray-300">White makes their first move (with ban in effect)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">3</span>
                    <p className="text-gray-300">White bans one of Black's possible responses</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">4</span>
                    <p className="text-gray-300">Black makes their move (with ban in effect)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">5</span>
                    <p className="text-gray-300">Pattern continues: Ban → Move → Ban → Move</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">6</span>
                    <p className="text-gray-300">Win by checkmating your opponent!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}