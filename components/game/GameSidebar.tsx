'use client';

import type { SimpleGameState } from '@/lib/game-types';
import { parseFEN, getNextAction, getWhoBans } from '@/lib/game-types';
import PlayerInfo from './PlayerInfo';
import MoveList from './MoveList';

interface GameSidebarProps {
  gameState: SimpleGameState;
}

export default function GameSidebar({ gameState }: GameSidebarProps) {
  const { turn } = parseFEN(gameState.fen);
  const nextAction = getNextAction(gameState.fen);
  const whoBans = getWhoBans(gameState.fen);

  const whitePlayer = gameState.players.white || 'Waiting...';
  const blackPlayer = gameState.players.black || 'Waiting...';

  // Determine who is active based on game phase
  let activeColor: 'white' | 'black';
  if (nextAction === 'ban' && whoBans) {
    // During ban phase, the banning player's clock runs
    activeColor = whoBans;
  } else {
    // During move phase, the current turn player's clock runs
    activeColor = turn;
  }

  // For solo games, always show who is actively making decisions
  if (gameState.isSoloGame && gameState.playerColor) {
    activeColor = gameState.playerColor;
  }

  const isWhiteActive = activeColor === 'white' && !gameState.gameOver;
  const isBlackActive = activeColor === 'black' && !gameState.gameOver;

  // Determine who is top and bottom based on player color
  const playerIsWhite = gameState.playerColor === 'white';
  const topPlayer = playerIsWhite ? blackPlayer : whitePlayer;
  const bottomPlayer = playerIsWhite ? whitePlayer : blackPlayer;
  const isTopActive = playerIsWhite ? isBlackActive : isWhiteActive;
  const isBottomActive = playerIsWhite ? isWhiteActive : isBlackActive;

  // Get clocks for each player
  const topClock = playerIsWhite ? gameState.clocks?.black : gameState.clocks?.white;
  const bottomClock = playerIsWhite ? gameState.clocks?.white : gameState.clocks?.black;

  return (
    <div className="bg-background-secondary rounded-lg p-4 flex flex-col h-full shadow-lg">
      <PlayerInfo 
        username={topPlayer} 
        isTurn={isTopActive} 
        clock={topClock}
        isClockActive={isTopActive}
      />
      <div className="my-2 border-t border-border"></div>
      <MoveList history={gameState.history || []} />
      <div className="my-2 border-t border-border"></div>
      <PlayerInfo 
        username={bottomPlayer} 
        isTurn={isBottomActive} 
        clock={bottomClock}
        isClockActive={isBottomActive}
      />
    </div>
  );
}
