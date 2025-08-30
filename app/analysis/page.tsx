'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BanChess } from 'ban-chess.ts';
import type {
  SimpleGameState,
  Move,
  Ban,
  SerializedAction,
} from '@/lib/game-types';
import {
  toBanChessMove,
  toBanChessBan,
  fromBanChessSerializedAction,
  toBanChessSerializedAction,
  validateSerializedActions,
} from '@/lib/utils/ban-chess-bridge';
import ImportExportPanel from '@/components/analysis/ImportExportPanel';
import GameStatePanel from '@/components/analysis/GameStatePanel';
import NavigationControls from '@/components/analysis/NavigationControls';

// Dynamic import for the board to avoid SSR issues
const ResizableBoard = dynamic(
  () => import('@/components/game/ResizableBoard'),
  { ssr: false }
);

// Initial position for a new game
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Helper function to apply actions to BanChess instance
function applyActionToGame(
  game: BanChess,
  action: { move?: Move; ban?: Ban }
): { success: boolean; error?: string } {
  try {
    if (action.move) {
      const banChessMove = toBanChessMove(action.move);
      return game.play({ move: banChessMove });
    } else if (action.ban) {
      const banChessBan = toBanChessBan(action.ban);
      return game.play({ ban: banChessBan });
    }
    return { success: false, error: 'No valid action provided' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export default function AnalysisPage() {
  // Store the game history of positions and moves
  const [gameHistory, setGameHistory] = useState<BanChess[]>([new BanChess()]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [moves, setMoves] = useState<SerializedAction[]>([]);

  // Get the current game instance
  const currentGame = gameHistory[currentMoveIndex];

  // Convert BanChess state to SimpleGameState for the board component
  const currentGameState = useMemo((): SimpleGameState => {
    if (!currentGame) {
      return {
        gameId: 'analysis',
        fen: INITIAL_FEN,
        nextAction: 'ban',
        legalActions: [],
        playerColor: 'white',
        isSoloGame: true,
        gameOver: false,
        players: {
          white: 'White',
          black: 'Black',
        },
      };
    }

    // Get legal actions based on what's next
    const nextAction = currentGame.nextActionType();
    let legalActions: string[] = [];

    if (nextAction === 'ban') {
      const legalBans = currentGame.legalBans();
      legalActions = legalBans.map(
        move => `${move.from}${move.to}${move.promotion || ''}`
      );
    } else {
      const legalMoves = currentGame.legalMoves();
      legalActions = legalMoves.map(
        move => `${move.from}${move.to}${move.promotion || ''}`
      );
    }

    return {
      gameId: 'analysis',
      fen: currentGame.fen(),
      nextAction: nextAction as 'move' | 'ban',
      legalActions,
      playerColor: currentGame.turn as 'white' | 'black',
      isSoloGame: true,
      gameOver: currentGame.gameOver(),
      inCheck: currentGame.inCheck(),
      players: {
        white: 'White',
        black: 'Black',
      },
      winner: undefined, // Will be determined from game state
      gameOverReason: undefined, // Will be determined from game state
    };
  }, [currentGame]);

  // Handle move from the board
  const handleMove = useCallback(
    (move: Move) => {
      // Validate it's actually time for a move (not a ban)
      if (currentGame.nextActionType() !== 'move') {
        console.error('Expected a ban, not a move');
        return;
      }

      const newGame = new BanChess(currentGame.fen());
      const result = applyActionToGame(newGame, { move });

      if (result.success) {
        try {
          const banChessMove = toBanChessMove(move);
          const serializedString = BanChess.serializeAction({
            move: banChessMove,
          });
          const serialized = fromBanChessSerializedAction(serializedString);

          if (currentMoveIndex < gameHistory.length - 1) {
            // We're in the middle of history, need to branch
            const newHistory = gameHistory.slice(0, currentMoveIndex + 1);
            const newMoves = moves.slice(0, currentMoveIndex);
            setGameHistory([...newHistory, newGame]);
            setMoves([...newMoves, serialized]);
          } else {
            // We're at the end of history
            setGameHistory([...gameHistory, newGame]);
            setMoves([...moves, serialized]);
          }
          setCurrentMoveIndex(currentMoveIndex + 1);
        } catch (error) {
          console.error('Failed to serialize move:', error);
        }
      } else {
        console.error('Move failed:', result.error);
      }
    },
    [currentGame, currentMoveIndex, gameHistory, moves]
  );

  // Handle ban from the board
  const handleBan = useCallback(
    (ban: Ban) => {
      // Validate it's actually time for a ban (not a move)
      if (currentGame.nextActionType() !== 'ban') {
        console.error('Expected a move, not a ban');
        return;
      }

      const newGame = new BanChess(currentGame.fen());
      const result = applyActionToGame(newGame, { ban });

      if (result.success) {
        try {
          const banChessBan = toBanChessBan(ban);
          const serializedString = BanChess.serializeAction({
            ban: banChessBan,
          });
          const serialized = fromBanChessSerializedAction(serializedString);

          if (currentMoveIndex < gameHistory.length - 1) {
            // We're in the middle of history, need to branch
            const newHistory = gameHistory.slice(0, currentMoveIndex + 1);
            const newMoves = moves.slice(0, currentMoveIndex);
            setGameHistory([...newHistory, newGame]);
            setMoves([...newMoves, serialized]);
          } else {
            // We're at the end of history
            setGameHistory([...gameHistory, newGame]);
            setMoves([...moves, serialized]);
          }
          setCurrentMoveIndex(currentMoveIndex + 1);
        } catch (error) {
          console.error('Failed to serialize ban:', error);
        }
      } else {
        console.error('Ban failed:', result.error);
      }
    },
    [currentGame, currentMoveIndex, gameHistory, moves]
  );

  // Navigation functions
  const goToStart = useCallback(() => {
    setCurrentMoveIndex(0);
  }, []);

  const goBack = useCallback(() => {
    if (currentMoveIndex > 0) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  }, [currentMoveIndex]);

  const goForward = useCallback(() => {
    if (currentMoveIndex < gameHistory.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  }, [currentMoveIndex, gameHistory.length]);

  const goToEnd = useCallback(() => {
    setCurrentMoveIndex(gameHistory.length - 1);
  }, [gameHistory.length]);

  // Import BCN/PGN
  const handleImport = useCallback((notation: string) => {
    try {
      // Parse the notation as BCN (space-separated actions)
      const actionStrings = notation.trim().split(/\s+/);

      if (actionStrings.length === 0) {
        return;
      }

      // Validate and convert to SerializedAction array
      const actions = validateSerializedActions(actionStrings);
      const actionStringsForBanChess = actionStrings; // Use plain strings for ban-chess.ts

      // Try to replay the game from these actions (validates them)
      BanChess.replayFromActions(actionStringsForBanChess);

      // Build the history by replaying move by move
      const newHistory: BanChess[] = [new BanChess()];
      const tempGame = new BanChess();

      for (const actionString of actionStringsForBanChess) {
        const result = tempGame.playSerializedAction(actionString);
        if (result.success) {
          // Create a new game instance at this position
          newHistory.push(new BanChess(tempGame.fen()));
        } else {
          console.error('Failed to apply action:', actionString);
          break;
        }
      }

      setGameHistory(newHistory);
      setMoves(actions.slice(0, newHistory.length - 1));
      setCurrentMoveIndex(newHistory.length - 1);
    } catch (error) {
      console.error('Failed to import notation:', error);
      // Try PGN format
      try {
        const newGame = new BanChess(undefined, notation);
        const historyStrings = newGame.getActionHistory();
        const history = validateSerializedActions(historyStrings);

        // Rebuild the game history
        const newHistory: BanChess[] = [new BanChess()];
        const tempGame = new BanChess();

        for (const actionString of historyStrings) {
          tempGame.playSerializedAction(actionString);
          newHistory.push(new BanChess(tempGame.fen()));
        }

        setGameHistory(newHistory);
        setMoves(history);
        setCurrentMoveIndex(newHistory.length - 1);
      } catch (pgnError) {
        console.error('Failed to import as PGN:', pgnError);
      }
    }
  }, []);

  // Export BCN
  const handleExport = useCallback(() => {
    // Convert SerializedActions back to strings and join
    return moves.map(move => toBanChessSerializedAction(move)).join(' ');
  }, [moves]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goForward();
          break;
        case 'Home':
          e.preventDefault();
          goToStart();
          break;
        case 'End':
          e.preventDefault();
          goToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  return (
    <div className='flex flex-col'>
      <h1 className='text-2xl sm:text-3xl font-bold text-foreground py-4 text-center'>
        Game Analysis
      </h1>

      {/* Center everything - the whole unit moves together */}
      <div className='flex-1 flex items-center justify-center p-4'>
        {/* This container holds board + sidebars as one unit */}
        <div className='flex gap-4 items-start'>
          {/* Left Sidebar - attached to board's left edge */}
          <aside className='w-[350px] flex-shrink-0 overflow-y-auto max-h-[800px]'>
            <ImportExportPanel
              onImport={handleImport}
              onExport={handleExport}
              currentNotation={moves.join(' ')}
            />
          </aside>

          {/* Board - the center anchor */}
          <div className='flex flex-col items-center'>
            <ResizableBoard
              gameState={currentGameState}
              onMove={handleMove}
              onBan={handleBan}
              playerColor='white'
            />

            {/* Navigation below board */}
            <div className='mt-4'>
              <NavigationControls
                onStart={goToStart}
                onBack={goBack}
                onForward={goForward}
                onEnd={goToEnd}
                canGoBack={currentMoveIndex > 0}
                canGoForward={currentMoveIndex < gameHistory.length - 1}
              />
            </div>
          </div>

          {/* Right Sidebar - attached to board's right edge */}
          <aside className='w-[350px] flex-shrink-0 overflow-y-auto max-h-[800px]'>
            <GameStatePanel
              currentPlayer={currentGameState.playerColor || 'white'}
              nextAction={currentGameState.nextAction || 'move'}
              gameOver={currentGameState.gameOver || false}
              inCheck={currentGameState.inCheck}
              winner={
                currentGameState.winner as
                  | 'white'
                  | 'black'
                  | 'draw'
                  | undefined
              }
              gameOverReason={currentGameState.gameOverReason}
              moveCount={moves.length}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
