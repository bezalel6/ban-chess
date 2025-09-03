"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HistoryEntry, SimpleGameState } from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";
import { useAuth } from "@/components/AuthProvider";
import { getUserRole } from "@/lib/game-utils";

// Support both old and new prop formats for compatibility
type MoveListProps = {
  history?: HistoryEntry[] | string[];
  onMoveSelect?: (moveIndex: number) => void;
  currentMoveIndex?: number;
  gameState?: SimpleGameState;
} | {
  // CompletedGameViewer format
  actions: string[];
  moveTimes?: number[];
  currentIndex?: number;
  onNavigate?: (moveIndex: number) => void;
};

export default function MoveList(props: MoveListProps) {
  const { user } = useAuth();
  
  // Handle both prop formats
  let history: HistoryEntry[] | string[];
  let onMoveSelect: ((moveIndex: number) => void) | undefined;
  let currentMoveIndex: number | undefined;
  let gameState: SimpleGameState | undefined;
  
  if ('actions' in props) {
    // CompletedGameViewer format - convert BCN actions to display format
    // Note: This is a temporary solution until we properly integrate BCN
    history = [];
    onMoveSelect = props.onNavigate;
    currentMoveIndex = props.currentIndex;
    gameState = undefined;
  } else {
    history = props.history || [];
    onMoveSelect = props.onMoveSelect;
    currentMoveIndex = props.currentMoveIndex;
    gameState = props.gameState;
  }
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Update selected index when currentMoveIndex prop changes
  useEffect(() => {
    if (currentMoveIndex !== undefined) {
      setSelectedIndex(currentMoveIndex);
    } else if (history.length > 0) {
      // If no current index specified, default to the last move
      setSelectedIndex(history.length - 1);
    }
  }, [currentMoveIndex, history.length]);

  // Auto-scroll to selected move when it changes
  useEffect(() => {
    if (scrollRef.current && selectedIndex !== null) {
      const selectedElement = scrollRef.current.querySelector(
        `[data-move-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  // Play sound when navigating to a historical move
  const playNavigationSound = useCallback((moveIndex: number) => {
    if (!history || history.length === 0 || moveIndex < 0 || moveIndex >= history.length) {
      return;
    }
    
    // Check if this is a HistoryEntry array
    if (typeof history[0] === 'object') {
      const entries = history as HistoryEntry[];
      const entry = entries[moveIndex];
      
      if (entry.actionType === 'ban') {
        // Play ban sound
        soundManager.playEvent('ban');
      } else if (entry.actionType === 'move' && entry.san) {
        // Analyze the SAN to determine move type
        const san = entry.san;
        const isCapture = san.includes('x');
        const isCheck = san.includes('+');
        const isCheckmate = san.includes('#');
        const isCastle = san === 'O-O' || san === 'O-O-O';
        const isPromotion = san.includes('=');
        
        // Play appropriate move sound (treat all navigation as non-opponent moves)
        soundManager.playMoveSound({
          check: isCheck || isCheckmate,
          capture: isCapture,
          castle: isCastle,
          promotion: isPromotion,
          isOpponent: false, // Navigation sounds are always "our" perspective
        });
      }
    }
  }, [history]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!history || history.length === 0) return;

      const totalMoves = history.length;
      let newIndex = selectedIndex ?? (totalMoves - 1); // Default to last move if nothing selected

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          e.stopPropagation();
          // Handle navigation - move one ply back
          if (selectedIndex === null) {
            // No selection means we're at the end, go to second-to-last
            newIndex = Math.max(-1, totalMoves - 2);
          } else if (selectedIndex <= 0) {
            // At first ply or before, go to starting position
            newIndex = -1;
          } else {
            // Go one ply back
            newIndex = selectedIndex - 1;
          }
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          e.stopPropagation();
          // Handle navigation - move one ply forward
          if (selectedIndex === null) {
            // No selection, already at end
            newIndex = totalMoves - 1;
          } else if (selectedIndex >= totalMoves - 1) {
            // Already at last move, stay there
            newIndex = totalMoves - 1;
          } else if (selectedIndex === -1) {
            // At starting position, go to first ply
            newIndex = 0;
          } else {
            // Move forward one ply
            newIndex = selectedIndex + 1;
          }
          break;
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          e.stopPropagation();
          // Go to beginning of game (same as extreme left arrow button)
          newIndex = -1; // Starting position
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          e.stopPropagation();
          // Go to end of game (same as extreme right arrow button)
          newIndex = totalMoves - 1;
          break;
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          newIndex = -1; // Starting position
          break;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          newIndex = totalMoves - 1;
          break;
        default:
          return;
      }

      // Always update if we have a valid new index
      if (newIndex !== selectedIndex && newIndex >= -1 && newIndex < totalMoves) {
        setSelectedIndex(newIndex);
        onMoveSelect?.(newIndex);
        // Only play navigation sound for valid move indices (not starting position)
        if (newIndex >= 0) {
          playNavigationSound(newIndex);
        }
      }
    },
    [history, selectedIndex, onMoveSelect, playNavigationSound]
  );

  // Set up keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle click on move
  const handleMoveClick = (index: number) => {
    setSelectedIndex(index);
    onMoveSelect?.(index);
    playNavigationSound(index);
  };

  // Track previous history length to detect when new moves arrive
  const prevHistoryLengthRef = useRef(history.length);
  
  // When history updates and we're at the end, auto-follow
  useEffect(() => {
    // Only auto-follow if the history actually grew (new moves added)
    if (history.length > prevHistoryLengthRef.current && history.length > 0) {
      // If selectedIndex is at or near the end, follow to the new end
      if (selectedIndex === null || selectedIndex >= prevHistoryLengthRef.current - 2) {
        setSelectedIndex(history.length - 1);
      }
      // Otherwise, maintain current position in history
    }
    
    // Update the ref for next comparison
    prevHistoryLengthRef.current = history.length;
  }, [history.length, selectedIndex]); // React to history length and selected index changes

  // Auto-scroll to bottom when new moves are added
  useEffect(() => {
    if (scrollRef.current && history.length > 0) {
      // Only scroll if we're following the live game (at or near the end)
      const isNearEnd = selectedIndex === null || 
                       selectedIndex >= history.length - 2 ||
                       currentMoveIndex === undefined ||
                       currentMoveIndex >= history.length - 2;
      
      if (isNearEnd) {
        // Scroll to bottom to show latest moves
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [history.length, selectedIndex, currentMoveIndex]);

  // Track the last played sound to avoid duplicates
  const lastPlayedMoveRef = useRef<number>(-1);
  
  // Play sound effects when new moves are added
  useEffect(() => {
    // Skip if no history
    if (!history || history.length === 0) {
      return;
    }
    
    // Only play sound for truly new moves (not initial load or navigation)
    if (history.length > lastPlayedMoveRef.current && lastPlayedMoveRef.current >= 0) {
      // Check if this is a HistoryEntry array
      if (typeof history[0] === 'object') {
        const entries = history as HistoryEntry[];
        const latestEntry = entries[entries.length - 1];
        
        // Determine if this is our move or opponent's
        const userRole = getUserRole(gameState || null, user?.userId);
        const isOpponentMove = latestEntry.player !== userRole.role;
        
        if (latestEntry.actionType === 'ban') {
          // Play ban sound
          soundManager.playEvent('ban');
        } else if (latestEntry.actionType === 'move' && latestEntry.san) {
          // Analyze the SAN to determine move type
          const san = latestEntry.san;
          const isCapture = san.includes('x');
          const isCheck = san.includes('+');
          const isCheckmate = san.includes('#');
          const isCastle = san === 'O-O' || san === 'O-O-O';
          const isPromotion = san.includes('=');
          
          // Play appropriate move sound
          soundManager.playMoveSound({
            check: isCheck || isCheckmate,
            capture: isCapture,
            castle: isCastle,
            promotion: isPromotion,
            isOpponent: isOpponentMove,
          });
        }
      }
    }
    
    // Update the last played move index
    if (history.length > 0) {
      lastPlayedMoveRef.current = history.length;
    }
  }, [history, history.length, gameState, user?.userId]); // Proper dependencies

  // Process history entries to create display rows with clickable elements
  interface DisplayRow {
    white?: {
      ban?: string;
      move?: string;
      banIndex?: number;
      moveIndex?: number;
    };
    black?: {
      ban?: string;
      move?: string;
      banIndex?: number;
      moveIndex?: number;
    };
  }

  const rows: DisplayRow[] = [];
  let currentRow: DisplayRow = {};
  let moveCount = 0;
  let actionIndex = 0;

  // Process history entries directly
  if (history.length > 0 && typeof history[0] === "object") {
    // New format: array of HistoryEntry objects
    const entries = history as HistoryEntry[];
    entries.forEach((entry) => {
      const isWhiteTurn = moveCount % 2 === 0;

      if (entry.actionType === "ban") {
        // Format ban without hyphen as requested
        const banText = `${entry.action.from}${entry.action.to}`;

        // Add ban to current position with index
        if (isWhiteTurn) {
          currentRow.white = { ban: banText, banIndex: actionIndex };
        } else {
          currentRow.black = { ban: banText, banIndex: actionIndex };
        }
      } else if (entry.actionType === "move") {
        // Use SAN notation if available, otherwise use coordinate notation
        const moveText = entry.san || `${entry.action.from}-${entry.action.to}`;

        // Add move to the existing ban entry or create new
        if (isWhiteTurn) {
          if (!currentRow.white) currentRow.white = {};
          currentRow.white.move = moveText;
          currentRow.white.moveIndex = actionIndex;
        } else {
          if (!currentRow.black) currentRow.black = {};
          currentRow.black.move = moveText;
          currentRow.black.moveIndex = actionIndex;
          // Complete row for black, push and reset
          rows.push(currentRow);
          currentRow = {};
        }

        moveCount++;
      }
      actionIndex++;
    });

    // Push incomplete row if exists
    if (currentRow.white || currentRow.black) {
      rows.push(currentRow);
    }
  } else {
    // Legacy format: array of strings - no bans to show
    (history as string[]).forEach((move, i) => {
      // Format legacy moves with hyphen if they're in coordinate notation
      let formattedMove = move;
      // Check if it's coordinate notation (4+ chars starting with a letter and number)
      if (move.match(/^[a-h][1-8][a-h][1-8]/)) {
        // Add hyphen between source and destination for better readability
        formattedMove = `${move.slice(0, 2)}-${move.slice(2)}`;
      }

      if (i % 2 === 0) {
        currentRow.white = { move: formattedMove, moveIndex: i };
      } else {
        currentRow.black = { move: formattedMove, moveIndex: i };
        rows.push(currentRow);
        currentRow = {};
      }
      actionIndex++;
    });
    if (currentRow.white) {
      rows.push(currentRow);
    }
  }

  return (
    <div
      ref={scrollRef}
      className="bg-background-tertiary rounded-lg h-full overflow-y-auto"
    >
      <div className="pb-1">
        <table className="w-full text-sm border-collapse border border-border">
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-background-secondary/50 h-8">
                <td
                className={`px-2 py-1 text-foreground-muted font-semibold align-middle text-center border border-border w-8 ${
                  index % 2 === 0
                    ? "bg-background-secondary/30"
                    : "bg-background-tertiary/50"
                }`}
              >
                {index + 1}.
                </td>
                <td
                className={`px-2 py-1 text-left align-middle border border-border ${
                  index % 2 === 0
                    ? "bg-background-secondary/20"
                    : "bg-background-tertiary/30"
                }`}
              >
                {row.white && (
                  <span className="text-foreground font-medium">
                    {row.white.ban && (
                      <span
                        className={`text-red-500 font-bold cursor-pointer hover:bg-red-500/20 px-1 rounded ${
                          selectedIndex === row.white.banIndex
                            ? "bg-red-500/30"
                            : ""
                        }`}
                        onClick={() =>
                          row.white?.banIndex !== undefined &&
                          handleMoveClick(row.white.banIndex)
                        }
                        data-move-index={row.white.banIndex}
                      >
                        {row.white.ban}
                      </span>
                    )}
                    {row.white.ban && row.white.move && " "}
                    {row.white.move && (
                      <span
                        className={`cursor-pointer hover:bg-blue-500/20 px-1 rounded ${
                          selectedIndex === row.white.moveIndex
                            ? "bg-blue-500/30"
                            : ""
                        }`}
                        onClick={() =>
                          row.white?.moveIndex !== undefined &&
                          handleMoveClick(row.white.moveIndex)
                        }
                        data-move-index={row.white.moveIndex}
                      >
                        {row.white.move}
                      </span>
                    )}
                  </span>
                )}
                </td>
                <td
                className={`px-2 py-1 text-left align-middle border border-border ${
                  index % 2 === 0
                    ? "bg-background-secondary/20"
                    : "bg-background-tertiary/30"
                }`}
              >
                {row.black && (
                  <span className="text-foreground font-medium">
                    {row.black.ban && (
                      <span
                        className={`text-red-500 font-bold cursor-pointer hover:bg-red-500/20 px-1 rounded ${
                          selectedIndex === row.black.banIndex
                            ? "bg-red-500/30"
                            : ""
                        }`}
                        onClick={() =>
                          row.black?.banIndex !== undefined &&
                          handleMoveClick(row.black.banIndex)
                        }
                        data-move-index={row.black.banIndex}
                      >
                        {row.black.ban}
                      </span>
                    )}
                    {row.black.ban && row.black.move && " "}
                    {row.black.move && (
                      <span
                        className={`cursor-pointer hover:bg-blue-500/20 px-1 rounded ${
                          selectedIndex === row.black.moveIndex
                            ? "bg-blue-500/30"
                            : ""
                        }`}
                        onClick={() =>
                          row.black?.moveIndex !== undefined &&
                          handleMoveClick(row.black.moveIndex)
                        }
                        data-move-index={row.black.moveIndex}
                      >
                        {row.black.move}
                      </span>
                    )}
                  </span>
                )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
