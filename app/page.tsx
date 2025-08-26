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
      // This shouldn't happen as button is disabled, but handle it anyway
      return;
    }
    joinQueue();
  };

  const inQueue = position !== null;

  return (
    <div className="container-custom">
      <div className="text-center mt-12">
        <h1 className="text-5xl mb-5">♟️ Ban Chess Web</h1>
        <p className="text-lg text-dark-200 mb-10">
          Play Ban Chess online - a variant where you can ban your
          opponent&apos;s moves!
        </p>

        <div className="game-info max-w-lg mx-auto">
          {!inQueue ? (
            <>
              <h2 className="mb-8 text-gray-100">Ready to Play?</h2>
              <button
                onClick={handleJoinQueue}
                disabled={!isAuthenticated || !connected || !authenticated}
                className="text-2xl px-10 py-5 w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isAuthenticated ? "Login Required" : 
                 !connected ? "Connecting..." :
                 !authenticated ? "Authenticating..." :
                 "Join Queue"}
              </button>
              {!isAuthenticated && (
                <p className="text-sm text-dark-300 mt-3">
                  Please set a username in the top-right corner first
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-8 text-gray-100">Finding Opponent...</h2>
              <div className="mb-8">
                <div className="loading-spinner" />
                <p className="text-lg mt-5">
                  Position in queue: {position}
                </p>
                {matched && (
                  <p className="text-success-400 mt-3">
                    Matched! Playing as {matched.color}
                    {matched.opponent && ` against ${matched.opponent}`}
                  </p>
                )}
              </div>
              <button
                onClick={leaveQueue}
                className="bg-error-400 text-lg px-5 py-2.5 hover:bg-red-600"
              >
                Leave Queue
              </button>
            </>
          )}

          {error && <div className="error mt-5">{error}</div>}
        </div>

        <div className="mt-15 text-dark-300">
          <h3 className="mb-4 text-gray-100">How to Play Ban Chess</h3>
          <ol className="text-left max-w-2xl mx-auto leading-relaxed">
            <li>Black bans one of White&apos;s opening moves</li>
            <li>White makes their first move (with the ban in effect)</li>
            <li>White bans one of Black&apos;s possible responses</li>
            <li>Black makes their move (with the ban in effect)</li>
            <li>Pattern continues: Ban → Move → Ban → Move...</li>
            <li>Win by checkmating your opponent!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}