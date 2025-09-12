'use client';

import { useEffect } from 'react';
import { useGameCreation } from '@/hooks/useGameCreation';

function SoloPlayContent() {
  const { createGame, isCreating, error } = useGameCreation();

  useEffect(() => {
    // Create the game immediately when component mounts
    createGame('solo').catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-red-500">Error</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">
          {isCreating ? 'Creating Game...' : 'Redirecting...'}
        </h2>
        <p className="text-foreground-muted">
          Setting up your practice game...
        </p>
      </div>
    </div>
  );
}

export default function SoloPlayPage() {
  return <SoloPlayContent />;
}