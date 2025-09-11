"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  useMemo,
} from "react";
import ChessBoard from "../ChessBoard";
import ChessBoardErrorBoundary from "../ChessBoardWrapper";
import type { SimpleGameState, Move, Ban } from "@/lib/game-types";

interface ResizableBoardProps {
  gameState: SimpleGameState;
  dests: Map<string, string[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  refreshKey?: number;
  orientation?: 'white' | 'black';
  canInteract?: boolean; // Pass through to ChessBoard
}

const ResizableBoard = memo(function ResizableBoard({
  gameState,
  dests,
  activePlayer,
  actionType,
  onMove,
  onBan,
  refreshKey: _refreshKey,
  orientation = 'white',
  canInteract = true,
}: ResizableBoardProps) {
  // Default board size in pixels - use multiples of 8 for perfect square alignment
  const MIN_SIZE = 400;
  const MAX_SIZE = 900;
  const DEFAULT_SIZE = 600;
  const PADDING = 32; // Total padding in chess-board-outer (16px each side)
  const GRID_SIZE = 8; // Grid alignment for smooth resizing

  // Helper to ensure the INNER board (after padding) is divisible by 8
  const roundToGrid = useCallback((size: number) => {
    // Calculate what the inner size would be
    const innerSize = size - PADDING;
    // Round inner size to nearest multiple of 8
    const roundedInner = Math.round(innerSize / GRID_SIZE) * GRID_SIZE;
    // Add padding back to get the total size
    return roundedInner + PADDING;
  }, []);

  // Calculate optimal board size based on viewport
  const calculateOptimalSize = useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_SIZE;
    
    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Account for header (~64px), padding, and other UI elements
    const headerHeight = 64;
    const uiPadding = 32;
    const availableHeight = viewportHeight - headerHeight - uiPadding;
    
    // Account for sidebars (224px left + 320px right = 544px) and gaps  
    const sidebarsWidth = 544;
    const gaps = 48; // 24px gap on each side
    const availableWidth = viewportWidth - sidebarsWidth - gaps - uiPadding;
    
    // Use the smaller dimension to maintain square aspect ratio
    const maxAvailableSize = Math.min(availableHeight, availableWidth);
    
    // Clamp between MIN and MAX sizes
    const optimalSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, maxAvailableSize));
    
    return roundToGrid(optimalSize);
  }, [roundToGrid]);

  const [boardSize, setBoardSize] = useState(() => {
    // Load saved size from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("boardSize");
      if (saved) {
        const size = parseInt(saved, 10);
        // Validate saved size is within bounds
        if (size >= MIN_SIZE && size <= MAX_SIZE) {
          return roundToGrid(size);
        }
      }
      // If no saved size or invalid, calculate optimal
      return calculateOptimalSize();
    }
    return roundToGrid(DEFAULT_SIZE);
  });

  // Separate state for visual size during resize for smoother feedback
  const [visualSize, setVisualSize] = useState(boardSize);
  const [isResizing, setIsResizing] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const startSizeRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const throttleRef = useRef<number | undefined>(undefined);

  // Recalculate optimal size on window resize if no saved preference
  useEffect(() => {
    const handleWindowResize = () => {
      const saved = localStorage.getItem("boardSize");
      if (!saved) {
        // Only auto-adjust if user hasn't set a preferred size
        const optimalSize = calculateOptimalSize();
        setBoardSize(optimalSize);
        setVisualSize(optimalSize);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [calculateOptimalSize]);

  // Debounced save to localStorage
  const debouncedSave = useCallback((size: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("boardSize", size.toString());
      }
    }, 300); // Save after 300ms of no changes
  }, []);

  // Throttled resize handler for smooth performance
  const handleResize = useCallback(
    (newSize: number) => {
      // Clamp size to valid range
      const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newSize));
      const gridAlignedSize = roundToGrid(clampedSize);

      // Update visual size immediately for smooth feedback (no throttling)
      setVisualSize(gridAlignedSize);

      // Throttle actual board updates to prevent excessive re-renders
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      throttleRef.current = window.setTimeout(() => {
        setBoardSize(gridAlignedSize);
        debouncedSave(gridAlignedSize);
      }, 16); // ~60fps throttling for board updates
    },
    [roundToGrid, debouncedSave],
  );

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startSizeRef.current = boardSize;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      // Add cursor style to body during resize
      document.body.style.cursor = "nwse-resize";
    },
    [boardSize],
  );

  // Handle touch start for mobile devices
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startSizeRef.current = boardSize;
      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [boardSize],
  );

  // Handle mouse/touch move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate diagonal distance for corner resize
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      // Use the average of X and Y movement for diagonal resize
      const delta = (deltaX + deltaY) / 2;
      const newSize = startSizeRef.current + delta;
      handleResize(newSize);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startPosRef.current.x;
      const deltaY = touch.clientY - startPosRef.current.y;
      const delta = (deltaX + deltaY) / 2;
      const newSize = startSizeRef.current + delta;
      handleResize(newSize);
    };

    const handleEnd = () => {
      setIsResizing(false);
      // Restore cursor
      document.body.style.cursor = "";
      // Ensure visual size matches actual size
      setVisualSize(boardSize);

      // Force chessground to recalculate piece positions after resize
      // This prevents pieces from drifting off-center
      requestAnimationFrame(() => {
        const cgWrap = boardRef.current?.querySelector(".cg-wrap");
        if (cgWrap) {
          // Trigger a reflow to force position recalculation
          const board = cgWrap.querySelector(".cg-board");
          if (board) {
            // Force a layout recalculation
            (board as HTMLElement).style.display = "none";
            (board as HTMLElement).offsetHeight; // Trigger reflow
            (board as HTMLElement).style.display = "";
          }
        }
      });
    };

    // Add event listeners with passive: false for better performance
    const options = { passive: false };
    document.addEventListener("mousemove", handleMouseMove, options);
    document.addEventListener("mouseup", handleEnd, options);
    document.addEventListener("touchmove", handleTouchMove, options);
    document.addEventListener("touchend", handleEnd, options);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      // Restore cursor on cleanup
      document.body.style.cursor = "";
    };
  }, [isResizing, handleResize, boardSize]);

  // Add resize observer to fix piece positions when board size changes
  useEffect(() => {
    if (!boardRef.current) return;
    
    // Check if the element is visible (not hidden by parent's display:none)
    const isVisible = boardRef.current.offsetParent !== null;
    if (!isVisible) return;

    const resizeObserver = new ResizeObserver(() => {
      // Fix piece positions after any size change
      requestAnimationFrame(() => {
        const pieces = boardRef.current?.querySelectorAll(".cg-board piece");
        if (pieces && pieces.length > 0) {
          // Force pieces to recenter by triggering a minor style update
          pieces.forEach((piece) => {
            const el = piece as HTMLElement;
            const currentTransform = el.style.transform;
            el.style.transform = "translateZ(0)";
            requestAnimationFrame(() => {
              el.style.transform = currentTransform;
            });
          });
        }
      });
    });

    resizeObserver.observe(boardRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [boardSize]);

  // Cleanup on unmount
  useEffect(() => {
    const saveTimeout = saveTimeoutRef.current;
    const rafId = rafRef.current;
    const throttleId = throttleRef.current;

    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (throttleId) {
        clearTimeout(throttleId);
      }
    };
  }, []);

  // Memoize container style to prevent unnecessary recalculations
  const containerStyle = useMemo(
    () => ({
      width: `${isResizing ? visualSize : boardSize}px`,
      height: `${isResizing ? visualSize : boardSize}px`,
    }),
    [isResizing, visualSize, boardSize],
  );

  // Memoize container className for performance
  const containerClassName = useMemo(
    () => `resizable-board-container ${isResizing ? "resizing" : ""}`,
    [isResizing],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Board Container with dynamic size and resize handle */}
      <div ref={boardRef} className={containerClassName} style={containerStyle}>
        <ChessBoardErrorBoundary>
          <ChessBoard 
            gameState={gameState} 
            dests={dests} 
            activePlayer={activePlayer}
            actionType={actionType}
            onMove={onMove} 
            onBan={onBan}
            orientation={orientation}
            canInteract={canInteract}
            size={boardSize - PADDING} // Pass the inner board size to ChessBoard
          />
        </ChessBoardErrorBoundary>

        {/* Resize handle - Lichess style corner grip */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`resize-handle absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize
                     ${isResizing ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
          style={{
            background: `linear-gradient(135deg, transparent 40%, rgba(255, 140, 0, 0.5) 40%, rgba(255, 140, 0, 0.5) 60%, transparent 60%),
                        linear-gradient(135deg, transparent 65%, rgba(255, 140, 0, 0.5) 65%, rgba(255, 140, 0, 0.5) 85%, transparent 85%)`,
          }}
        >
          {/* Visual indicator */}
          <div className="absolute bottom-1 right-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="text-lichess-orange-500"
            >
              <path
                d="M1 11L11 1M6 11L11 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ResizableBoard;
