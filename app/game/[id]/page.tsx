"use client";

import { use } from "react";
import dynamic from "next/dynamic";

// Use the unified GameViewer component that handles both live and completed games
const GameViewer = dynamic(() => import("@/components/GameViewer"), {
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

/**
 * Game page that uses the unified GameViewer component.
 * The GameViewer handles both live and completed games seamlessly,
 * transitioning between states without requiring a page refresh.
 */
export default function GamePage({ params }: GamePageProps) {
  const { id: gameId } = use(params);

  return <GameViewer gameId={gameId} />;
}
