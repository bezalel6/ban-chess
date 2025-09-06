"use client";

import { useEffect, useRef, useState } from "react";
import StaticGameThumbnail from "./StaticGameThumbnail";

interface LazyGameThumbnailProps {
  fen: string;
  orientation?: "white" | "black";
  result?: string;
  onClick?: () => void;
}

/**
 * Lazy-loaded game thumbnail that only renders when visible in viewport.
 * Pattern inspired by Lichess's mini-game approach.
 */
export default function LazyGameThumbnail({
  fen,
  orientation = "white",
  result,
  onClick,
}: LazyGameThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || hasBeenVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
          }
        });
      },
      {
        // Start loading when board is 100px away from viewport
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenVisible]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {hasBeenVisible ? (
        <StaticGameThumbnail
          fen={fen}
          orientation={orientation}
          result={result}
          onClick={onClick}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 animate-pulse rounded-lg" />
      )}
    </div>
  );
}