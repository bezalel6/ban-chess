'use client';

import { useState, useEffect } from 'react';
import { useAuth, generateDefaultUsername } from '@/contexts/AuthContext';

export function UsernameOverlay() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !username) {
      setUsername(generateDefaultUsername());
    }
  }, [isAuthenticated, isLoading, username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set username');
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 border border-slate-700/50 rounded-xl shadow-2xl p-8 max-w-md w-full backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">♟️</div>
          <h2 className="text-3xl font-bold mb-2 text-white">Welcome to Ban Chess!</h2>
          <p className="text-gray-400">Choose your username to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg focus:outline-none focus:border-success-400 focus:bg-slate-900/70 text-white placeholder-gray-500 text-lg transition-all"
              minLength={3}
              maxLength={20}
              required
              disabled={isSubmitting}
              autoFocus
            />
            {error && (
              <p className="text-error-400 text-sm mt-2 px-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || username.length < 3}
            className="w-full bg-success-400 text-white py-3 rounded-lg font-semibold hover:bg-success-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? 'Setting up...' : 'Let\'s Play!'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Username will be visible to other players</p>
          <p className="mt-1">3-20 characters, case-insensitive</p>
        </div>
      </div>
    </div>
  );
}