import React from 'react';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Override the default padding from root layout for game pages
    <div className="game-layout -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {children}
    </div>
  );
}