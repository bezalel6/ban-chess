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

// Demo sequence showing Scholar's Mate without Bishop using bans
const DEMO_POSITIONS: DemoPosition[] = [
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    description: "Scholar's Mate usually needs Queen + Bishop. But with bans...",
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    description: "Black bans Bf1-c4, blocking the bishop's development",
    bannedMove: { from: "f1", to: "c4" },
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    description: "White plays e2-e4 anyway, opening the queen's diagonal",
    lastMove: ["e2", "e4"],
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    description: "White bans Ng8-f6! The key defensive move is blocked",
    bannedMove: { from: "g8", to: "f6" },
  },
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    description: "Black plays e7-e5, unaware of the coming threat",
    lastMove: ["e7", "e5"],
  },
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    description: "White strikes with Qd1-h5! Threatening mate on f7",
    lastMove: ["d1", "h5"],
    highlightSquares: ["f7"],
  },
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    description: "White bans Qd8-e7, blocking Black's queen defense",
    bannedMove: { from: "d8", to: "e7" },
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    description: "Black desperately plays Nb8-c6, but it's too late",
    lastMove: ["b8", "c6"],
  },
  {
    fen: "r1bqkbnr/pppp1Qpp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3",
    description: "Checkmate! Qh5xf7# - Scholar's Mate without the bishop!",
    lastMove: ["h5", "f7"],
    highlightSquares: ["f7", "e8"],
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
    }, 3500); // 3.5 seconds per position for better readability

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
                <span className="text-lichess-orange-500">Scholar&apos;s Mate</span> Without a Bishop
              </h2>
              <p className="text-foreground-muted">
                See how strategic banning enables impossible tactics
              </p>
            </div>

            {/* Current Position Description */}
            <div className="bg-background-tertiary rounded-lg p-4 relative">
              {currentPosition === DEMO_POSITIONS.length - 1 && (
                <div className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  Checkmate!
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-foreground-subtle bg-background/50 px-2 py-0.5 rounded">
                  Step {currentPosition + 1}/{DEMO_POSITIONS.length}
                </span>
              </div>
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
                <strong className="text-foreground">Tactical Power:</strong> By banning Nf6 and Qe7, White achieves a 4-move checkmate that&apos;s impossible in regular chess.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}