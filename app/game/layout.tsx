import React from 'react';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Game pages use flex layout without margin overrides
    <div className="game-layout flex-grow flex flex-col">
      {children}
    </div>
  );
}