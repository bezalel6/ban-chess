'use client';

import React, { useState } from 'react';
import { useActionState } from 'react';
import { loginAction, type AuthState } from '@/app/actions/auth';

function generateDefaultUsername(): string {
  const adjectives = ['Swift', 'Clever', 'Bold', 'Silent', 'Mighty'];
  const nouns = ['Knight', 'Bishop', 'Rook', 'Queen', 'King'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export default function UsernameOverlay() {
  const [username, setUsername] = useState(() => generateDefaultUsername());
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAction, 
    { error: null }
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">♟️</div>
          <h2 className="text-3xl font-bold mb-2 text-white">Welcome to Ban Chess!</h2>
          <p className="text-gray-400">Choose your username to begin</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-slate-900/70 text-white placeholder-gray-500 text-lg transition-all"
              minLength={2}
              maxLength={20}
              pattern="[a-zA-Z0-9_\-]{2,20}"
              required
              disabled={isPending}
              autoFocus
            />
            {state.error && (
              <p className="text-red-400 text-sm mt-2 px-1">{state.error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || username.length < 2}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isPending ? 'Setting up...' : 'Let\'s Play!'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Username will be visible to other players</p>
          <p className="mt-1">2-20 characters, letters, numbers, hyphens, and underscores</p>
        </div>
      </div>
    </div>
  );
}