'use client';

import { useAuth } from '@/components/AuthProvider';
import { useActionState, useState, useTransition } from 'react';
import { loginAction, logoutAction, type AuthState } from '@/app/actions/auth';

// Function to generate a random username
function generateDefaultUsername(): string {
  const adjectives = ['Swift', 'Clever', 'Bold', 'Silent', 'Mighty'];
  const nouns = ['Knight', 'Bishop', 'Rook', 'Queen', 'King'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

// Logged-in user display
function LoggedInView({ username }: { username: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      logoutAction();
    });
  };

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 shadow-xl p-3 flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 leading-none">Playing as</span>
            <span className="text-sm text-white font-medium">{username}</span>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700"></div>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isPending ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

// Logged-out overlay for login
function LoggedOutView() {
  const [username, setUsername] = useState(generateDefaultUsername);
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(loginAction, { error: null });

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
              className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg focus:outline-none focus:border-blue-400 text-white text-lg transition-all"
              required
              disabled={isPending}
            />
            {state.error && <p className="text-red-400 text-sm mt-2 px-1">{state.error}</p>}
          </div>
          <button
            type="submit"
            disabled={isPending || username.length < 2}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Setting up...' : 'Let\'s Play!'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main component that decides which view to show
export default function UserDisplay() {
  const { user } = useAuth();

  if (!user) {
    return <LoggedOutView />;
  }

  return <LoggedInView username={user.username!} />;
}
