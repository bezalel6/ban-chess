"use client";

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
    <div 
      className="inline-block cursor-pointer"
      onClick={handleClick}
      style={{ width: size, height: size }}
    >
      {/* Temporarily simplified - thumbnail view needs different implementation */}
      <div className="bg-background-secondary rounded-lg flex items-center justify-center h-full">
        <span className="text-foreground-muted">Game {gameId.slice(0, 8)}</span>
      </div>
    </div>
  );
}