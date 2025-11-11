"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ChessgroundBoard from "@/components/board/ChessgroundBoard";

interface DemoPosition {
  fen: string;
  bannedMove?: { from: string; to: string };
  description: string;
  highlightSquares?: string[];
  lastMove?: [string, string];
  check?: "white" | "black";
}

// Demo sequence showing the forced checkmate-by-ban
const DEMO_POSITIONS: DemoPosition[] = [
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/5Q2/PPPPPPPP/RNB1KBNR w KQkq - 0 1 1",
    description:
      "White's Queen threatens f7. The pawn is undefended and the King can't protect it.",
  },
  {
    fen: "rnbqkbnr/pppppQpp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1 2+",
    description:
      "Queen captures f7 with check! Normally, Black would simply capture the Queen with the King.",
    lastMove: ["f3", "f7"],
    highlightSquares: ["f7", "e8"],
    check: "black",
  },
  {
    fen: "rnbqkbnr/pppppQpp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1 3:e8f7#",
    description:
      "It's Black's turn. Black is in check, the only legal move: Kxf7 was banned, therefore there are no more legal moves. Black is checkmated.",
    bannedMove: { from: "e8", to: "f7" },
    highlightSquares: ["e8", "f7"],
    check: "black",
  },
];

export default function InteractiveDemo() {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance through positions
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setCurrentPosition((prev) => (prev + 1) % DEMO_POSITIONS.length);
    }, 4000); // 4 seconds per position for better readability with only 3 positions

    return () => clearTimeout(timer);
  }, [currentPosition, isPlaying]);

  const handlePositionClick = useCallback((index: number) => {
    setCurrentPosition(index);
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Add native event listener for scroll wheel navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent page scrolling
      e.preventDefault();
      e.stopPropagation();

      // Pause auto-play when user scrolls
      setIsPlaying(false);

      // Scroll down = next position, scroll up = previous position
      if (e.deltaY > 0) {
        // Scrolling down - go to next position (stop at last)
        setCurrentPosition((prev) =>
          Math.min(prev + 1, DEMO_POSITIONS.length - 1)
        );
      } else if (e.deltaY < 0) {
        // Scrolling up - go to previous position (stop at first)
        setCurrentPosition((prev) => Math.max(prev - 1, 0));
      }
    };

    // Use passive: false to allow preventDefault
    container.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  const position = DEMO_POSITIONS[currentPosition];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className="bg-background-secondary rounded-xl p-4 md:p-6 shadow-xl"
        ref={containerRef}
      >
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
          {/* Board Section */}
          <div className="relative">
            <div className="aspect-square w-full max-w-md mx-auto">
              <ChessgroundBoard
                fen={position.fen}
                orientation="white"
                viewOnly={true}
                bannedMove={position.bannedMove}
                lastMove={position.lastMove}
                check={position.check}
                coordinates={true}
                animation={true}
                highlight={{ lastMove: true, check: true }}
              />
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
              aria-label={isPlaying ? "Pause demo" : "Play demo"}
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                <span className="text-lichess-orange-500">Checkmate</span> by
                Ban
              </h2>
              <p className="text-foreground-muted">
                A unique winning pattern only possible in BanChess
              </p>
            </div>

            {/* Current Position Description */}
            <div className="bg-background-tertiary rounded-lg p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-foreground-subtle bg-background/50 px-2 py-0.5 rounded">
                  {position.fen.includes(":")
                    ? "Ban Phase"
                    : position.fen.split(" ")[6]
                    ? `Ply ${position.fen.split(" ")[6]}`
                    : "Opening"}
                </span>
              </div>
              <p className="text-lg font-medium">{position.description}</p>
              {position.bannedMove && (
                <p className="text-sm text-destructive-400 mt-2">
                  ❌ Banned: {position.bannedMove.from} →{" "}
                  {position.bannedMove.to}
                </p>
              )}
              {position.lastMove && (
                <p className="text-sm text-success-400 mt-2">
                  ✓ Played: {position.lastMove[0]} → {position.lastMove[1]}
                </p>
              )}
            </div>

            {/* Position Indicators */}
            <div className="flex gap-2 justify-center">
              {DEMO_POSITIONS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handlePositionClick(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentPosition
                      ? "w-8 bg-lichess-orange-500"
                      : "bg-foreground-subtle hover:bg-foreground-muted"
                  }`}
                  aria-label={`Go to position ${index + 1}`}
                />
              ))}
            </div>

            {/* Key Concept */}
            {/* <div className="border-t border-border pt-4">
              <p className="text-sm text-foreground-muted">
                <strong className="text-foreground">The key:</strong> Black is
                in check with only one way to escape. White blocks that escape
                move. Since Black is in check and has no legal moves, it&apos;s
                checkmate!
              </p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
