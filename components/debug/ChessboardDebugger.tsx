"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { BanChess } from "ban-chess.ts";
import type { Move, Ban, SimpleGameState, HistoryEntry } from "@/lib/game-types";
import { Settings2, RotateCcw, Zap, Activity, Eye, Volume2, VolumeX } from "lucide-react";
import soundManager from "@/lib/sound-manager";

const ChessBoard = dynamic(() => import("@/components/ChessBoard"), {
  ssr: false,
});

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  moveLatency: number;
  animationDuration: number;
  lastMoveTime: number;
}

interface BoardConfig {
  // Animation settings
  animationEnabled: boolean;
  animationDuration: number;
  moveSpeed: number;

  // Visual settings
  showCoordinates: boolean;
  showLastMove: boolean;
  showPossibleMoves: boolean;
  showBannedMove: boolean;
  highlightCheck: boolean;
  premoveEnabled: boolean;

  // Performance settings
  snapbackDuration: number;
  appearDuration: number;
  touchmoveDuration: number;

  // Board behavior
  draggable: boolean;
  selectable: boolean;
  viewOnly: boolean;
  disableContextMenu: boolean;

  // Sound settings
  moveSoundEnabled: boolean;
  captureSoundEnabled: boolean;
  checkSoundEnabled: boolean;

  // Ban Chess specific
  banPenalty: "mild" | "moderate" | "severe";
  showBanOverlay: boolean;
  banOverlayOpacity: number;

  // Responsive settings
  autoResize: boolean;
  minBoardSize: number;
  maxBoardSize: number;
  
  // Board orientation
  autoFlip: boolean;
}

const DEFAULT_CONFIG: BoardConfig = {
  animationEnabled: true,
  animationDuration: 200,
  moveSpeed: 200,
  showCoordinates: true,
  showLastMove: true,
  showPossibleMoves: true,
  showBannedMove: true,
  highlightCheck: true,
  premoveEnabled: true,
  snapbackDuration: 200,
  appearDuration: 200,
  touchmoveDuration: 0,
  draggable: true,
  selectable: true,
  viewOnly: false,
  disableContextMenu: true,
  moveSoundEnabled: true,
  captureSoundEnabled: true,
  checkSoundEnabled: true,
  banPenalty: "moderate",
  showBanOverlay: true,
  banOverlayOpacity: 0.4,
  autoResize: true,
  minBoardSize: 300,
  maxBoardSize: 800,
  autoFlip: true, // Auto-flip board to current player's perspective
};

// Local storage key for config persistence
const CONFIG_STORAGE_KEY = "chessboard-debugger-config";

export default function ChessboardDebugger() {
  // Load config from localStorage on mount
  const loadConfig = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_CONFIG;
        }
      }
    }
    return DEFAULT_CONFIG;
  }, []);

  const [config, setConfig] = useState<BoardConfig>(loadConfig);
  const [gameState, setGameState] = useState<SimpleGameState | null>(null);
  const [game, setGame] = useState<BanChess | null>(null);
  const [dests, setDests] = useState<Map<string, string[]>>(new Map());
  const [gameHistory, setGameHistory] = useState<Array<{ fen: string; move?: Move; ban?: Ban; san?: string }>>([]); 
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [lastBan, setLastBan] = useState<Ban | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    moveLatency: 0,
    animationDuration: 200,
    lastMoveTime: 0,
  });
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [showSettings, setShowSettings] = useState(true);
  const [testMode, setTestMode] = useState<"idle" | "stress" | "rapid">("idle");

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const moveStartTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  }, [config]);

  const updateGameState = useCallback((gameInstance: BanChess, moveOrBan?: Move | Ban, san?: string) => {
    const fen = gameInstance.fen();
    const isGameOver = gameInstance.gameOver();
    // For checkmate, always set inCheck to true since checkmate = check + no legal moves
    const isCheckmate = gameInstance.inCheckmate && gameInstance.inCheckmate();
    const inCheck = isCheckmate || gameInstance.inCheck();

    // Build proper history for check detection
    const historyEntries: HistoryEntry[] = [];
    if (moveOrBan) {
      const actionType = 'promotion' in moveOrBan ? 'move' : 'ban';
      const player = gameInstance.getActivePlayer() === 'white' ? 'black' : 'white'; // The player who just made the action
      
      historyEntries.push({
        turnNumber: Math.floor(gameHistory.length / 2) + 1,
        player,
        actionType,
        action: moveOrBan,
        san,
        fen,
        bannedMove: lastBan || undefined
      });
    }

    const newState: SimpleGameState = {
      gameId: "debug-game",
      fen,
      players: {
        white: { id: "debug-white", username: "White" },
        black: { id: "debug-black", username: "Black" },
      },
      activePlayer: gameInstance.getActivePlayer() as "white" | "black",
      history: historyEntries, // Provide the last action for check detection
      gameOver: isGameOver,
      inCheck,
      result: isGameOver ? (isCheckmate ? (gameInstance.getActivePlayer() === 'white' ? '0-1' : '1-0') : '1/2-1/2') : undefined,
      timeControl: undefined,
    };

    setGameState(newState);

    // Track history entry
    if (moveOrBan) {
      const historyEntry: { fen: string; move?: Move; ban?: Ban; san?: string } = { fen };
      if ('from' in moveOrBan && 'to' in moveOrBan && 'promotion' in moveOrBan) {
        historyEntry.move = moveOrBan as Move;
      } else {
        historyEntry.ban = moveOrBan as Ban;
      }
      if (san) {
        historyEntry.san = san;
      }
      setGameHistory(prev => [...prev, historyEntry]);
      setCurrentHistoryIndex(prev => prev + 1);
    }

    // Update possible moves using getLegalActions
    try {
      const actions = gameInstance.getLegalActions();
      const destMap = new Map<string, string[]>();

      // Filter for moves (not bans) based on current action type
      if (gameInstance.getActionType() === "move") {
        actions.forEach((action) => {
          if ("move" in action) {
            const move = action.move;
            const from = move.from;
            if (!destMap.has(from)) {
              destMap.set(from, []);
            }
            destMap.get(from)!.push(move.to);
          }
        });
      } else {
        // For ban phase, show all possible bans
        actions.forEach((action) => {
          if ("ban" in action) {
            const ban = action.ban;
            const from = ban.from;
            if (!destMap.has(from)) {
              destMap.set(from, []);
            }
            destMap.get(from)!.push(ban.to);
          }
        });
      }
      setDests(destMap);
    } catch {
      // If getLegalActions fails, clear destinations
      setDests(new Map());
    }
  }, [gameHistory.length, lastBan]);

  const handleMove = useCallback(
    (move: Move) => {
      if (!game) return;

      moveStartTimeRef.current = performance.now();

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = game.play({ move: move as any });
        if (result.success) {
          const moveEndTime = performance.now();
          const latency = moveEndTime - moveStartTimeRef.current;

          setMetrics((prev) => ({
            ...prev,
            moveLatency: latency,
            lastMoveTime: moveEndTime,
          }));

          updateGameState(game, move, result.san);
          setLastBan(null); // Clear last ban when a move is made
          
          // Play appropriate sound effects
          if (config.moveSoundEnabled) {
            // Check SAN notation for capture (contains 'x')
            const isCapture = result.san && result.san.includes('x');
            
            if (game.inCheck()) {
              soundManager.playEvent("check");
            } else if (isCapture) {
              soundManager.playEvent("capture");
            } else if (move.promotion) {
              soundManager.playEvent("promote");
            } else {
              soundManager.playEvent("move");
            }
          }
          
          // Check for game end
          if (game.gameOver()) {
            if (config.checkSoundEnabled) {
              if (game.inCheckmate()) {
                soundManager.playEvent("game-end");
              } else {
                soundManager.playEvent("draw-offer");
              }
            }
          }
        }
      } catch (error) {
        console.error("Move failed:", error);
      }
    },
    [game, config.moveSoundEnabled, config.checkSoundEnabled, updateGameState]
  );

  const handleBan = useCallback(
    (ban: Ban) => {
      if (!game) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = game.play({ ban: ban as any });
        if (result.success) {
          updateGameState(game, ban, result.san);
          setLastBan(ban); // Track the last ban for visualization
          
          // Play ban sound effect based on penalty severity
          if (config.moveSoundEnabled) {
            if (config.banPenalty === "severe") {
              soundManager.playEvent("ban-attempt-severe");
            } else if (config.banPenalty === "moderate") {
              soundManager.playEvent("ban-attempt-moderate");
            } else {
              soundManager.playEvent("ban-attempt-mild");
            }
          }
        }
      } catch (error) {
        console.error("Ban failed:", error);
      }
    },
    [game, updateGameState, config.moveSoundEnabled, config.banPenalty]
  );

  // Initialize game and sound manager
  useEffect(() => {
    const newGame = new BanChess(); // Use default constructor for starting position
    setGame(newGame);
    updateGameState(newGame);
    setGameHistory([{ fen: newGame.fen() }]);
    setCurrentHistoryIndex(0);
    
    // Initialize sound manager with saved preferences
    if (config.moveSoundEnabled) {
      soundManager.setEnabled(true);
      soundManager.setVolume(0.5);
    }
  }, [updateGameState, config.moveSoundEnabled]);

  // FPS monitoring
  useEffect(() => {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;

      if (delta >= 1000) {
        setMetrics((prev) => ({
          ...prev,
          fps: Math.round((frameCountRef.current * 1000) / delta),
        }));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      frameCountRef.current++;
      rafRef.current = requestAnimationFrame(measureFPS);
    };

    rafRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Stress test modes
  useEffect(() => {
    if (testMode === "idle") return;

    let interval: ReturnType<typeof setInterval>;

    if (testMode === "stress") {
      // Make random moves rapidly
      interval = setInterval(() => {
        if (game && !game.gameOver()) {
          const actions = game.getLegalActions();
          if (actions.length > 0) {
            const randomAction =
              actions[Math.floor(Math.random() * actions.length)];
            // Handle based on action type
            if ("move" in randomAction) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleMove(randomAction.move as any);
            } else if ("ban" in randomAction) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleBan(randomAction.ban as any);
            }
          }
        } else if (game) {
          // Reset game
          const newGame = new BanChess(); // Use default constructor for starting position
          setGame(newGame);
          updateGameState(newGame);
        }
      }, 100);
    } else if (testMode === "rapid") {
      // Make moves at a more reasonable pace
      interval = setInterval(() => {
        if (game && !game.gameOver()) {
          const actions = game.getLegalActions();
          if (actions.length > 0) {
            const randomAction =
              actions[Math.floor(Math.random() * actions.length)];
            // Handle based on action type
            if ("move" in randomAction) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleMove(randomAction.move as any);
            } else if ("ban" in randomAction) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleBan(randomAction.ban as any);
            }
          }
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [testMode, game, handleMove, handleBan, updateGameState]);

  const resetGame = () => {
    const newGame = new BanChess(); // Use default constructor for starting position
    setGame(newGame);
    updateGameState(newGame);
    setTestMode("idle");
    setGameHistory([{ fen: newGame.fen() }]);
    setCurrentHistoryIndex(0);
    setLastBan(null);
    
    // Play game start sound
    if (config.moveSoundEnabled) {
      soundManager.playEvent("game-start");
    }
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  };

  const updateConfig = (
    key: keyof BoardConfig,
    value: boolean | number | string
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const exportConfig = () => {
    const configStr = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configStr);
    alert("Configuration copied to clipboard!");
  };

  const importConfig = () => {
    const input = prompt("Paste configuration JSON:");
    if (input) {
      try {
        const newConfig = JSON.parse(input);
        setConfig(newConfig);
        alert("Configuration imported successfully!");
      } catch {
        alert("Invalid configuration JSON");
      }
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Settings Panel */}
      <div
        className={`${
          showSettings ? "w-96" : "w-0"
        } transition-all duration-300 overflow-hidden bg-background-secondary border-r border-border`}
      >
        <div className="p-4 h-full overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Board Configuration Debugger
          </h2>

          {/* Performance Metrics */}
          <div className="mb-6 p-3 bg-background rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">FPS:</span>
                <span
                  className={`ml-2 font-mono ${
                    metrics.fps >= 50
                      ? "text-green-500"
                      : metrics.fps >= 30
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  {metrics.fps}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Move Latency:</span>
                <span className="ml-2 font-mono">
                  {metrics.moveLatency.toFixed(1)}ms
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Render Time:</span>
                <span className="ml-2 font-mono">
                  {metrics.renderTime.toFixed(1)}ms
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Animation:</span>
                <span className="ml-2 font-mono">
                  {config.animationDuration}ms
                </span>
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="mb-6 p-3 bg-background rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Test Controls
            </h3>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setTestMode("idle")}
                className={`px-3 py-1 rounded text-sm ${
                  testMode === "idle"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-tertiary"
                }`}
              >
                Idle
              </button>
              <button
                onClick={() => setTestMode("rapid")}
                className={`px-3 py-1 rounded text-sm ${
                  testMode === "rapid"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-tertiary"
                }`}
              >
                Rapid (1/s)
              </button>
              <button
                onClick={() => setTestMode("stress")}
                className={`px-3 py-1 rounded text-sm ${
                  testMode === "stress"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-tertiary"
                }`}
              >
                Stress (10/s)
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetGame}
                className="flex-1 px-3 py-1 bg-background-tertiary rounded text-sm flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() =>
                  setOrientation((prev) =>
                    prev === "white" ? "black" : "white"
                  )
                }
                className="flex-1 px-3 py-1 bg-background-tertiary rounded text-sm"
              >
                Flip Board
              </button>
            </div>
            
            <label className="flex items-center justify-between mt-2">
              <span className="text-sm">Auto-flip for active player</span>
              <input
                type="checkbox"
                checked={config.autoFlip}
                onChange={(e) =>
                  updateConfig("autoFlip", e.target.checked)
                }
              />
            </label>
          </div>

          {/* Animation Settings */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Animation Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm">Animation Enabled</span>
                <input
                  type="checkbox"
                  checked={config.animationEnabled}
                  onChange={(e) =>
                    updateConfig("animationEnabled", e.target.checked)
                  }
                  className="ml-2"
                />
              </label>

              <label className="block">
                <span className="text-sm">
                  Animation Duration: {config.animationDuration}ms
                </span>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={config.animationDuration}
                  onChange={(e) =>
                    updateConfig("animationDuration", Number(e.target.value))
                  }
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm">
                  Move Speed: {config.moveSpeed}ms
                </span>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={config.moveSpeed}
                  onChange={(e) =>
                    updateConfig("moveSpeed", Number(e.target.value))
                  }
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm">
                  Snapback Duration: {config.snapbackDuration}ms
                </span>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={config.snapbackDuration}
                  onChange={(e) =>
                    updateConfig("snapbackDuration", Number(e.target.value))
                  }
                  className="w-full"
                />
              </label>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Visual Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm">Show Coordinates</span>
                <input
                  type="checkbox"
                  checked={config.showCoordinates}
                  onChange={(e) =>
                    updateConfig("showCoordinates", e.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Show Last Move</span>
                <input
                  type="checkbox"
                  checked={config.showLastMove}
                  onChange={(e) =>
                    updateConfig("showLastMove", e.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Show Possible Moves</span>
                <input
                  type="checkbox"
                  checked={config.showPossibleMoves}
                  onChange={(e) =>
                    updateConfig("showPossibleMoves", e.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Highlight Check</span>
                <input
                  type="checkbox"
                  checked={config.highlightCheck}
                  onChange={(e) =>
                    updateConfig("highlightCheck", e.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Show Banned Move</span>
                <input
                  type="checkbox"
                  checked={config.showBannedMove}
                  onChange={(e) =>
                    updateConfig("showBannedMove", e.target.checked)
                  }
                />
              </label>
            </div>
          </div>

          {/* Sound Settings */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {config.moveSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Sound Settings
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm">Move Sounds</span>
                <input
                  type="checkbox"
                  checked={config.moveSoundEnabled}
                  onChange={(e) => {
                    updateConfig("moveSoundEnabled", e.target.checked);
                    soundManager.setEnabled(e.target.checked);
                  }}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Capture Sounds</span>
                <input
                  type="checkbox"
                  checked={config.captureSoundEnabled}
                  onChange={(e) => updateConfig("captureSoundEnabled", e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Check Sounds</span>
                <input
                  type="checkbox"
                  checked={config.checkSoundEnabled}
                  onChange={(e) => updateConfig("checkSoundEnabled", e.target.checked)}
                />
              </label>

              <label className="block">
                <span className="text-sm">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.moveSoundEnabled ? 50 : 0}
                  onChange={(e) => {
                    const volume = Number(e.target.value) / 100;
                    soundManager.setVolume(volume);
                  }}
                  disabled={!config.moveSoundEnabled}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          {/* Board Behavior */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Board Behavior</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm">Draggable</span>
                <input
                  type="checkbox"
                  checked={config.draggable}
                  onChange={(e) => updateConfig("draggable", e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Selectable</span>
                <input
                  type="checkbox"
                  checked={config.selectable}
                  onChange={(e) => updateConfig("selectable", e.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">Premove Enabled</span>
                <input
                  type="checkbox"
                  checked={config.premoveEnabled}
                  onChange={(e) =>
                    updateConfig("premoveEnabled", e.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm">View Only</span>
                <input
                  type="checkbox"
                  checked={config.viewOnly}
                  onChange={(e) => updateConfig("viewOnly", e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Ban Chess Settings */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Ban Chess Settings</h3>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm">Ban Penalty Severity</span>
                <select
                  value={config.banPenalty}
                  onChange={(e) =>
                    updateConfig("banPenalty", e.target.value)
                  }
                  className="w-full mt-1 px-2 py-1 bg-background rounded border border-border"
                >
                  <option value="mild">Mild (Green)</option>
                  <option value="moderate">Moderate (Yellow)</option>
                  <option value="severe">Severe (Red)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm">
                  Ban Overlay Opacity:{" "}
                  {(config.banOverlayOpacity * 100).toFixed(0)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.banOverlayOpacity * 100}
                  onChange={(e) =>
                    updateConfig(
                      "banOverlayOpacity",
                      Number(e.target.value) / 100
                    )
                  }
                  className="w-full"
                />
              </label>
            </div>
          </div>

          {/* Export/Import/Reset */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={exportConfig}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm"
            >
              Export
            </button>
            <button
              onClick={importConfig}
              className="flex-1 px-3 py-2 bg-background-tertiary rounded text-sm"
            >
              Import
            </button>
            <button
              onClick={resetConfig}
              className="flex-1 px-3 py-2 bg-background-tertiary rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col">
        {/* Toggle Settings Button */}
        <div className="p-2 border-b border-border">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1 bg-background-secondary rounded flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showSettings ? "Hide" : "Show"} Settings
          </button>
        </div>

        {/* Board Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            style={{
              width: config.autoResize ? "100%" : `${config.maxBoardSize}px`,
              maxWidth: `${config.maxBoardSize}px`,
              minWidth: `${config.minBoardSize}px`,
            }}
          >
            <ChessBoard
              gameState={gameState}
              dests={dests}
              activePlayer={gameState.activePlayer}
              actionType={(game?.getActionType() as "move" | "ban") || "move"}
              onMove={handleMove}
              onBan={handleBan}
              orientation={config.autoFlip && gameState.activePlayer ? gameState.activePlayer : orientation}
              viewOnly={config.viewOnly}
              canInteract={!config.viewOnly && config.draggable && config.selectable}
              size={config.autoResize ? undefined : config.maxBoardSize}
              className={`transition-all duration-${config.animationDuration}`}
              banPenalty={config.banPenalty}
            />
          </div>
        </div>

        {/* Quick Stats Bar with History Info */}
        <div className="p-2 border-t border-border bg-background-secondary">
          <div className="flex justify-between text-sm">
            <span>
              FPS:{" "}
              <span
                className={`font-mono ${
                  metrics.fps >= 50
                    ? "text-green-500"
                    : metrics.fps >= 30
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {metrics.fps}
              </span>
            </span>
            <span>
              Animation:{" "}
              <span className="font-mono">
                {config.animationEnabled
                  ? `${config.animationDuration}ms`
                  : "OFF"}
              </span>
            </span>
            <span>
              Move Latency:{" "}
              <span className="font-mono">
                {metrics.moveLatency.toFixed(1)}ms
              </span>
            </span>
            <span>
              History:{" "}
              <span className="font-mono">
                {currentHistoryIndex + 1}/{gameHistory.length}
              </span>
            </span>
            <span>
              Test Mode:{" "}
              <span className="font-mono text-primary">
                {testMode.toUpperCase()}
              </span>
            </span>
            {lastBan && (
              <span className="text-yellow-500">
                Banned: {lastBan.from}→{lastBan.to}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
