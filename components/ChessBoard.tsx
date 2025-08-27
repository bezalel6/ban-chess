"use client";

import React, { useMemo, useEffect, useRef } from "react";
import Chessground, {
  Dests,
  DrawShape,
  Key,
  ReactChessGroundProps,
} from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import type { Move, Ban, GameState, HistoryEntry } from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";

interface ChessBoardProps {
  gameState: GameState;

  onMove: (_move: Move) => void;

  onBan: (_ban: Ban) => void;
  playerColor?: "white" | "black";
}

const ChessBoard = React.memo(
  function ChessBoard({
    gameState,
    onMove,
    onBan,
    playerColor,
  }: ChessBoardProps) {
    const previousHistoryRef = useRef<HistoryEntry[]>([]);
    const hasPlayedGameStartRef = useRef(false);
    const lastBannedMoveRef = useRef<Ban | null>(null);

    // Play game start sound when first joining
    useEffect(() => {
      if (!hasPlayedGameStartRef.current && gameState.history.length === 0) {
        soundManager.play("game-start");
        hasPlayedGameStartRef.current = true;
      }
    }, [gameState.history.length]);

    // Play game-end sound when game is over
    useEffect(() => {
      if (
        gameState.status === "checkmate" ||
        gameState.status === "stalemate" ||
        gameState.status === "draw"
      ) {
        soundManager.play("game-end");
      }
    }, [gameState.status]);

    // Detect and play sounds for moves and bans
    useEffect(() => {
      const previousHistory = previousHistoryRef.current;
      const currentHistory = gameState.history;

      // Check if a new action was made
      if (currentHistory.length > previousHistory.length) {
        const lastEntry = currentHistory[currentHistory.length - 1];

        // Play sound for bans
        if (lastEntry.actionType === "ban") {
          soundManager.play("ban");
          // Store the banned move for visual indication
          lastBannedMoveRef.current = lastEntry.action as Ban;
        } else if (lastEntry.actionType === "move") {
          const move = lastEntry.action as Move;
          const isOpponent = lastEntry.player !== playerColor;

          // Determine move characteristics
          const moveDetails = {
            isOpponent,
            capture: false,
            castle: false,
            check: false,
            promotion: false,
          };

          // Check for capture (if 'x' is in the SAN notation)
          if (lastEntry.san && lastEntry.san.includes("x")) {
            moveDetails.capture = true;
          }

          // Check for castling
          if (
            lastEntry.san &&
            (lastEntry.san === "O-O" || lastEntry.san === "O-O-O")
          ) {
            moveDetails.castle = true;
          }

          // Check for check
          if (lastEntry.san && lastEntry.san.includes("+")) {
            moveDetails.check = true;
          }

          // Check for checkmate (game end)
          if (lastEntry.san && lastEntry.san.includes("#")) {
            soundManager.play("game-end");
          } else if (move.promotion) {
            moveDetails.promotion = true;
          }

          // Play the appropriate sound
          if (!lastEntry.san?.includes("#")) {
            soundManager.playMoveSound(moveDetails);
          }
        }
      }

      // Update the reference
      previousHistoryRef.current = [...currentHistory];
    }, [gameState.history, playerColor]);

    const config = useMemo(() => {
      // Create ban indicator shapes
      const banShapes: DrawShape[] = [];

      // Look for the most recent ban in history
      let recentBan: Ban | null = null;
      for (let i = gameState.history.length - 1; i >= 0; i--) {
        const entry = gameState.history[i];
        if (entry.actionType === "ban") {
          // The ban action itself contains the banned move
          recentBan = entry.action as Ban;
          // Found ban at history[i]
          break;
        }
      }

      // If we found a recent ban, show it
      if (recentBan) {
        // Creating shapes for ban
        // Add red arrow from origin to destination of the banned move
        banShapes.push({
          orig: recentBan.from,
          dest: recentBan.to,
          brush: "red",
        });
        // Add a red circle on the destination square
        banShapes.push({
          orig: recentBan.to as Key,
          brush: "red",
        });
        // Created shapes
      } else {
        // No ban found in history
      }

      const baseConfig: ReactChessGroundProps = {
        fen: gameState.fen.split(" ")[0],
        orientation: playerColor || "white",
        coordinates: true,
        autoCastle: true,
        highlight: {
          lastMove: true,
          check: true,
        },
        animation: {
          enabled: true,
          duration: 200,
        },
        movable: {
          free: false,
          color: undefined,
          dests: new Map(),
          showDests: true,
        },
        premovable: {
          enabled: false,
        },
        drawable: {
          enabled: true,
          visible: true,
          defaultSnapToValidMove: false,
          eraseOnClick: false,
          shapes: banShapes,
          brushes: {
            green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
            red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
            blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
            yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
            paleBlue: {
              key: "pb",
              color: "#003088",
              opacity: 0.4,
              lineWidth: 15,
            },
            paleGreen: {
              key: "pg",
              color: "#15781B",
              opacity: 0.4,
              lineWidth: 15,
            },
            paleRed: {
              key: "pr",
              color: "#882020",
              opacity: 0.4,
              lineWidth: 15,
            },
            paleGrey: {
              key: "pgr",
              color: "#4a4a4a",
              opacity: 0.35,
              lineWidth: 15,
            },
            purple: {
              key: "purple",
              color: "#68217a",
              opacity: 0.65,
              lineWidth: 10,
            },
            pink: {
              key: "pink",
              color: "#ee2080",
              opacity: 0.5,
              lineWidth: 10,
            },
            white: { key: "white", color: "white", opacity: 1, lineWidth: 10 },
            paleWhite: {
              key: "pwhite",
              color: "white",
              opacity: 0.6,
              lineWidth: 10,
            },
          },
        },
      };

      // Disable all moves if game is over
      if (gameState.status !== "playing") {
        baseConfig.movable = {
          free: false,
          color: undefined,
          dests: new Map(),
          showDests: false,
        };
      } else if (
        gameState.nextAction === "move" &&
        (gameState.isSoloGame || gameState.turn === playerColor)
      ) {
        // Player's turn to move
        const dests: Dests = new Map<Key, Key[]>();
        gameState.legalMoves.forEach((move) => {
          if (!dests.has(move.from)) {
            dests.set(move.from, []);
          }
          dests.get(move.from)!.push(move.to);
        });

        baseConfig.movable = {
          free: false,
          color: gameState.turn,
          dests: dests,
          showDests: true,
          events: {
            after: (orig: string, dest: string) => {
              const move = gameState.legalMoves.find(
                (m) => m.from === orig && m.to === dest
              );
              if (move) {
                onMove(move);
              }
            },
          },
        };
      } else if (
        gameState.nextAction === "ban" &&
        (gameState.isSoloGame || gameState.turn === playerColor)
      ) {
        // Player's turn to ban opponent's move
        const dests = new Map<Key, Key[]>();
        gameState.legalBans.forEach((ban) => {
          if (!dests.has(ban.from)) {
            dests.set(ban.from, []);
          }
          dests.get(ban.from)!.push(ban.to);
        });

        // During ban phase, show opponent's pieces as movable (these are the moves you can ban)
        const opponentColor = gameState.turn === "white" ? "black" : "white";

        baseConfig.movable = {
          free: false,
          color: opponentColor,
          dests: dests,
          showDests: true,
          events: {
            after: (orig: string, dest: string) => {
              const ban = gameState.legalBans.find(
                (b) => b.from === orig && b.to === dest
              );
              if (ban) {
                onBan(ban);
              }
            },
          },
        };

        // Update drawable config for ban mode with yellow highlights
        baseConfig.drawable = {
          ...baseConfig.drawable,
          enabled: true,
          defaultSnapToValidMove: false,
          shapes: [
            { orig: "e4", dest: "d1", brush: "red" },
            ...banShapes,
            // Add yellow highlights for available bans
            ...Array.from(dests.entries()).flatMap(([from, tos]) =>
              tos.map((to) => ({
                orig: from,
                dest: to,
                brush: "yellow",
              }))
            ),
          ],
        };
      } else {
        // Not player's turn - disable moves
        baseConfig.movable = {
          free: false,
          color: undefined,
          dests: new Map(),
          showDests: false,
        };
      }

      return baseConfig;
    }, [gameState, playerColor, onMove, onBan]);

    return (
      <div className="chess-board-container">
        <Chessground {...config} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if game state actually changed
    return (
      prevProps.gameState.fen === nextProps.gameState.fen &&
      prevProps.gameState.nextAction === nextProps.gameState.nextAction &&
      prevProps.gameState.turn === nextProps.gameState.turn &&
      prevProps.playerColor === nextProps.playerColor &&
      prevProps.gameState.legalMoves === nextProps.gameState.legalMoves &&
      prevProps.gameState.legalBans === nextProps.gameState.legalBans
    );
  }
);

export default ChessBoard;
