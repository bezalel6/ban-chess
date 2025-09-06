"use client";

import dynamic from "next/dynamic";

const CompactGameClient = dynamic(
  () => import("@/components/CompactGameClient"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-background-secondary rounded-lg animate-pulse" 
           style={{ width: "200px", height: "200px" }} />
    )
  }
);

interface GameThumbnailProps {
  gameId: string;
  size?: number;
  onClick?: () => void;
}

export default function GameThumbnail({ 
  gameId, 
  size = 200, 
  onClick
}: GameThumbnailProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default: Navigate to the game view
      window.location.href = `/game/${gameId}`;
    }
  };

  return (
    <div className="inline-block">
      <CompactGameClient
        gameId={gameId}
        thumbnailMode={true}
        thumbnailSize={size}
        onThumbnailClick={handleClick}
      />
    </div>
  );
}