'use client';

import type { SimpleGameState } from '@/lib/game-types';
import { parseFEN } from '@/lib/game-types';
import PlayerInfo from './PlayerInfo';
import MoveList from './MoveList';

interface GameSidebarProps {
  gameState: SimpleGameState;
}

export default function GameSidebar({ gameState }: GameSidebarProps) {
  const { turn } = parseFEN(gameState.fen);

  const whitePlayer = gameState.players.white || 'Waiting...';
  const blackPlayer = gameState.players.black || 'Waiting...';

  const isWhiteTurn = turn === 'white';
  const isBlackTurn = turn === 'black';

  // Determine who is top and bottom based on player color
  const playerIsWhite = gameState.playerColor === 'white';
  const topPlayer = playerIsWhite ? blackPlayer : whitePlayer;
  const bottomPlayer = playerIsWhite ? whitePlayer : blackPlayer;
  const isTopTurn = playerIsWhite ? isBlackTurn : isWhiteTurn;
  const isBottomTurn = playerIsWhite ? isWhiteTurn : isBlackTurn;

  return (
    <div className="bg-background-secondary rounded-lg p-4 flex flex-col h-full shadow-lg">
      <PlayerInfo username={topPlayer} isTurn={isTopTurn} />
      <div className="my-2 border-t border-border"></div>
      <MoveList history={gameState.history || []} />
      <div className="my-2 border-t border-border"></div>
      <PlayerInfo username={bottomPlayer} isTurn={isBottomTurn} />
    </div>
  );
}
