"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GameClient = dynamic(() => import("@/components/GameClient"), {
  ssr: false,
});

const CompletedGameViewer = dynamic(() => import("@/components/CompletedGameViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p>Loading game...</p>
      </div>
    </div>
  ),
});

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GamePage({ params }: GamePageProps) {
  const { id: gameId } = use(params);
  const [isCompletedGame, setIsCompletedGame] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the game exists in the database (completed game)
    const checkGameStatus = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}`);
        if (response.ok) {
          // Game exists in database - it's a completed game
          setIsCompletedGame(true);
        } else if (response.status === 404) {
          // Game not in database - try WebSocket for live game
          setIsCompletedGame(false);
        } else {
          // Some other error - default to WebSocket
          setIsCompletedGame(false);
        }
      } catch (error) {
        console.error("Error checking game status:", error);
        // Default to WebSocket on error
        setIsCompletedGame(false);
      } finally {
        setLoading(false);
      }
    };

    checkGameStatus();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  // Render appropriate component based on game status
  if (isCompletedGame) {
    return <CompletedGameViewer gameId={gameId} />;
  } else {
    return <GameClient gameId={gameId} />;
  }
}