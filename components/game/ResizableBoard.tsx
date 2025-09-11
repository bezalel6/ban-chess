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
  banDifficulty?: "easy" | "medium" | "hard";
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
  banDifficulty = "medium",
}: ResizableBoardProps) {
  // Default board size in pixels - use multiples of 8 for perfect square alignment
  const MIN_SIZE = 400;
  const MAX_SIZE = 900;
  const DEFAULT_SIZE = 600;
  const GRID_SIZE = 8; // Grid alignment for smooth resizing

  // Helper to ensure the board size is divisible by 8 for perfect square alignment
  const roundToGrid = useCallback((size: number) => {
    // Round size to nearest multiple of 8
    return Math.round(size / GRID_SIZE) * GRID_SIZE;
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

  // Resize handler for smooth performance
  const handleResize = useCallback(
    (newSize: number) => {
      // Clamp size to valid range
      const clampedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newSize));
      const gridAlignedSize = roundToGrid(clampedSize);

      // Update visual size immediately for smooth feedback
      setVisualSize(gridAlignedSize);
      
      // Also update board size immediately during resize
      // Since we're using visualSize for the actual board rendering during resize,
      // we can update boardSize without throttling for better state consistency
      setBoardSize(gridAlignedSize);
      
      // Debounced save to localStorage
      debouncedSave(gridAlignedSize);
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

      // Add cursor style and class to body during resize
      document.body.style.cursor = "nwse-resize";
      document.body.classList.add("resizing");
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
      // Restore cursor and remove class
      document.body.style.cursor = "";
      document.body.classList.remove("resizing");
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
      // Restore cursor and class on cleanup
      document.body.style.cursor = "";
      document.body.classList.remove("resizing");
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

    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
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
    <div className="flex flex-col items-center">
      {/* Board Container with dynamic size and resize handle */}
      <div ref={boardRef} className={`${containerClassName} relative`} style={containerStyle}>
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
            size={isResizing ? visualSize : boardSize} // Use visualSize during resize for immediate feedback
            banDifficulty={banDifficulty}
          />
        </ChessBoardErrorBoundary>

        {/* Resize handle - Lichess style diagonal grip */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`resize-handle-lichess absolute cursor-nwse-resize z-10 rounded-full transition-colors
                     ${isResizing ? "bg-background-secondary/50" : "hover:bg-lichess-orange-500/20"}`}
          style={{
            right: '-9px',
            bottom: '-9px',
            width: '22px',
            height: '22px',
          }}
        />
      </div>
    </div>
  );
});

export default ResizableBoard;
