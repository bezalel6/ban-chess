"use client";

import React, { useState, useEffect, useCallback } from "react";
import ChessgroundBoard from "@/components/board/ChessgroundBoard";

interface DemoPosition {
  fen: string;
  bannedMove?: { from: string; to: string };
  description: string;
  highlightSquares?: string[];
  lastMove?: [string, string];
}

// Demo sequence showing the essence of Ban Chess
const DEMO_POSITIONS: DemoPosition[] = [
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    description: "Black bans White's e2-e4 opening",
    bannedMove: { from: "e2", to: "e4" },
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
    description: "White plays d2-d4 instead",
    lastMove: ["d2", "d4"],
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
    description: "White bans Black's d7-d5 response",
    bannedMove: { from: "d7", to: "d5" },
  },
  {
    fen: "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2",
    description: "Black develops knight to f6 instead",
    lastMove: ["g8", "f6"],
  },
  {
    fen: "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2",
    description: "The strategic dance continues...",
    bannedMove: { from: "e2", to: "e4" },
  },
];

export default function InteractiveDemo() {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-advance through positions
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setCurrentPosition((prev) => (prev + 1) % DEMO_POSITIONS.length);
    }, 3000); // 3 seconds per position

    return () => clearTimeout(timer);
  }, [currentPosition, isPlaying]);

  const handlePositionClick = useCallback((index: number) => {
    setCurrentPosition(index);
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const position = DEMO_POSITIONS[currentPosition];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-background-secondary rounded-xl p-4 md:p-6 shadow-xl">
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
                coordinates={true}
                animation={true}
                highlight={{ lastMove: true, check: false }}
              />
            </div>
            
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
              aria-label={isPlaying ? "Pause demo" : "Play demo"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                <span className="text-lichess-orange-500">Ban</span>Chess in Action
              </h2>
              <p className="text-foreground-muted">
                Watch how banning moves creates a dynamic new chess experience
              </p>
            </div>

            {/* Current Position Description */}
            <div className="bg-background-tertiary rounded-lg p-4">
              <p className="text-lg font-medium">{position.description}</p>
              {position.bannedMove && (
                <p className="text-sm text-destructive-400 mt-2">
                  ❌ Banned: {position.bannedMove.from} → {position.bannedMove.to}
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
            <div className="border-t border-border pt-4">
              <p className="text-sm text-foreground-muted">
                <strong className="text-foreground">Key Concept:</strong> Players alternate between banning opponent moves and making their own moves, creating unique strategic depth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}