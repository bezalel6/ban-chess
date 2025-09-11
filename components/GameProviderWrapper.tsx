'use client';

import { ReactNode } from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { UserRoleProvider } from '@/contexts/UserRoleContext';

// Inner component that has access to GameContext
function GameUserRoleWrapper({ children }: { children: ReactNode }) {
  const { gameState } = useGame();
  
  return (
    <UserRoleProvider gameState={gameState}>
      {children}
    </UserRoleProvider>
  );
}

// Outer component that provides GameContext
export function GameProviderWrapper({ 
  gameId, 
  children 
}: { 
  gameId?: string;
  children: ReactNode;
}) {
  return (
    <GameProvider gameId={gameId}>
      <GameUserRoleWrapper>
        {children}
      </GameUserRoleWrapper>
    </GameProvider>
  );
}