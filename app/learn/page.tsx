"use client";

import { useState } from "react";
import {
  ChevronRight,
  PlayCircle,
  BookOpen,
  Zap,
  Target,
  Shield,
  Brain,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { SimpleGameState } from "@/lib/game-types";
import dynamic from "next/dynamic";

// Dynamic import for the board to avoid SSR issues
const ResizableBoard = dynamic(
  () => import("@/components/game/ResizableBoard"),
  { ssr: false },
);

interface Puzzle {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  fen: string;
  scenario: string;
  solution: string;
  explanation: string;
  gameState: SimpleGameState;
}

const puzzles: Puzzle[] = [
  {
    id: "checkmate-by-ban",
    title: "Checkmate by Ban",
    description: "Learn how to win by banning the only escape move",
    difficulty: "beginner",
    fen: "r6k/7p/8/8/8/8/7P/4Q2K w - - 0 1",
    scenario: "White Queen on e1, Black King on h8. It's Black's turn to ban.",
    solution: "Ban e1-e8 (the only move that prevents checkmate)",
    explanation:
      "If Black bans e1→e8, White cannot deliver checkmate. But if Black bans any other move, White plays Qe8# for checkmate!",
    gameState: {
      gameId: "puzzle-1",
      fen: "r6k/7p/8/8/8/8/7P/4Q2K w - - 0 1",
      nextAction: "ban",
      legalActions: ["e1e8", "e1e2", "e1e3", "e1e4", "e1e5", "e1e6", "e1e7"],
      gameOver: false,
      players: {
        white: { id: "puzzle-white", username: "White" },
        black: { id: "puzzle-black", username: "Black" },
      },
    },
  },
  {
    id: "forced-stalemate",
    title: "Force a Draw with Bans",
    description: "Use bans to create stalemate",
    difficulty: "intermediate",
    fen: "k7/P7/K7/8/8/8/8/8 w - - 0 1",
    scenario: "White pawn on a7, ready to promote. Black must ban wisely.",
    solution: "Ban a7-a8 (promotion), forcing stalemate",
    explanation:
      "By banning the pawn promotion, Black leaves White with no legal moves (stalemate), resulting in a draw instead of losing to a new Queen.",
    gameState: {
      gameId: "puzzle-2",
      fen: "k7/P7/K7/8/8/8/8/8 w - - 0 1",
      nextAction: "ban",
      legalActions: ["a7a8"],
      gameOver: false,
      players: {
        white: { id: "puzzle-white", username: "White" },
        black: { id: "puzzle-black", username: "Black" },
      },
    },
  },
  {
    id: "opening-advantage",
    title: "Opening Ban Strategy",
    description: "Control the center with strategic bans",
    difficulty: "intermediate",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    scenario:
      "Game start. Black bans first. Which central pawn advance should Black ban?",
    solution: "Ban e2-e4 or d2-d4",
    explanation:
      "Banning e2→e4 or d2→d4 prevents White from controlling the center with their most natural opening moves, forcing them into less common openings.",
    gameState: {
      gameId: "puzzle-3",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      nextAction: "ban",
      legalActions: ["e2e4", "d2d4", "g1f3", "b1c3", "e2e3", "d2d3"],
      gameOver: false,
      players: {
        white: { id: "puzzle-white", username: "White" },
        black: { id: "puzzle-black", username: "Black" },
      },
    },
  },
];

export default function LearnPage() {
  const router = useRouter();
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-4">
          Learn <span className="text-lichess-orange-500">Ban Chess</span>
        </h1>
        <p className="text-xl text-foreground-muted max-w-3xl mx-auto">
          Master the unique mechanics of Ban Chess where every move is preceded
          by a strategic ban
        </p>
      </div>

      {/* How It Works Section */}
      <div className="bg-background-secondary rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-lichess-orange-500" />
          How Ban Chess Works
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">The Ban-Move Cycle</h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-lichess-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <div>
                  <strong>Opponent Bans:</strong> Before you move, your opponent
                  must ban one specific square-to-square move (e.g., e2→e4)
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-lichess-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <div>
                  <strong>You Move:</strong> Make any legal move except the
                  banned one
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-lichess-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <div>
                  <strong>Repeat:</strong> This pattern continues throughout the
                  entire game
                </div>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Key Rules</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 text-lichess-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  Bans are <strong>mandatory</strong> - you must ban before
                  opponent moves
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 text-lichess-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  Each ban is <strong>temporary</strong> - only affects the next
                  move
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 text-lichess-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  Bans specify exact <strong>from→to squares</strong> (not
                  pieces)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-5 h-5 text-lichess-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Checkmate by ban</strong> wins the game instantly
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Game Flow Diagram */}
        <div className="bg-background rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Complete Game Flow Example
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">Turn 1:</span>
              <span className="text-red-500">Black bans e2→e4</span>
              <span className="text-foreground-muted">→</span>
              <span className="text-blue-500">White plays d2→d4</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">Turn 2:</span>
              <span className="text-blue-500">White bans e7→e5</span>
              <span className="text-foreground-muted">→</span>
              <span className="text-red-500">Black plays d7→d5</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">Turn 3:</span>
              <span className="text-red-500">Black bans g1→f3</span>
              <span className="text-foreground-muted">→</span>
              <span className="text-blue-500">White plays b1→c3</span>
            </div>
            <div className="text-foreground-muted mt-2">...and so on</div>
          </div>
        </div>
      </div>

      {/* Strategy Tips */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h3 className="text-lg font-semibold">Opening Strategy</h3>
          </div>
          <p className="text-foreground-muted">
            Ban central pawn advances (e4, d4) to disrupt your opponent&apos;s
            opening preparation and force them into unfamiliar positions.
          </p>
        </div>

        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-8 h-8 text-red-500" />
            <h3 className="text-lg font-semibold">Tactical Bans</h3>
          </div>
          <p className="text-foreground-muted">
            In tactical positions, ban the opponent&apos;s most forcing moves -
            captures, checks, or threats. This can turn winning positions into
            draws.
          </p>
        </div>

        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-green-500" />
            <h3 className="text-lg font-semibold">Defensive Bans</h3>
          </div>
          <p className="text-foreground-muted">
            When under attack, ban the most dangerous attacking move. Remember:
            if a ban leaves you in check with no moves, you lose!
          </p>
        </div>
      </div>

      {/* Interactive Puzzles Section */}
      <div className="bg-background-secondary rounded-lg p-8" id="puzzles">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-lichess-orange-500" />
          Interactive Puzzles
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose a Puzzle</h3>
            <div className="space-y-3">
              {puzzles.map((puzzle) => (
                <button
                  key={puzzle.id}
                  onClick={() => {
                    setSelectedPuzzle(puzzle);
                    setShowSolution(false);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedPuzzle?.id === puzzle.id
                      ? "bg-background border-lichess-orange-500"
                      : "bg-background-tertiary border-border hover:bg-background hover:border-lichess-orange-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{puzzle.title}</h4>
                      <p className="text-sm text-foreground-muted mt-1">
                        {puzzle.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        puzzle.difficulty === "beginner"
                          ? "bg-green-500/20 text-green-500"
                          : puzzle.difficulty === "intermediate"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {puzzle.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            {selectedPuzzle ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Puzzle: {selectedPuzzle.title}
                </h3>

                {/* Chess Board */}
                <div className="bg-background rounded-lg p-4">
                  <ResizableBoard
                    gameState={selectedPuzzle.gameState}
                    onMove={() => {}}
                    onBan={() => {}}
                  />
                </div>

                {/* Scenario */}
                <div className="bg-background rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Scenario</h4>
                  <p className="text-foreground-muted">
                    {selectedPuzzle.scenario}
                  </p>
                </div>

                {/* Solution Toggle */}
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="btn-secondary w-full"
                >
                  {showSolution ? "Hide Solution" : "Show Solution"}
                </button>

                {showSolution && (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-green-500 mb-2">
                        Solution
                      </h4>
                      <p>{selectedPuzzle.solution}</p>
                    </div>

                    <div className="bg-background rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Explanation</h4>
                      <p className="text-foreground-muted">
                        {selectedPuzzle.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Brain className="w-16 h-16 text-foreground-muted mx-auto mb-4" />
                  <p className="text-foreground-muted">
                    Select a puzzle to begin practicing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-lichess-orange-500/10 border border-lichess-orange-500/30 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
        <p className="text-lg text-foreground-muted mb-6">
          Put your Ban Chess knowledge to the test in a real game!
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push("/play/local")}
            className="btn-secondary flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Practice Solo
          </button>
          <button
            onClick={() => router.push("/play/online")}
            className="btn-primary flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Find Opponent
          </button>
        </div>
      </div>
    </div>
  );
}
