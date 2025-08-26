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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">Welcome to 2Ban Chess! ♟️</h2>
          <p className="text-gray-600">What should we call you?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
              minLength={3}
              maxLength={20}
              required
              disabled={isSubmitting}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || username.length < 3}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Setting up...' : 'Let\'s Play!'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Username will be visible to other players</p>
          <p className="mt-1">3-20 characters, case-insensitive</p>
        </div>
      </div>
    </div>
  );
}