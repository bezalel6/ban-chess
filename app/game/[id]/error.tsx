'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='container-custom'>
        <div className='text-center'>
          <h2 className='text-2xl font-semibold text-white mb-4'>
            Something went wrong!
          </h2>
          <p className='text-gray-400 mb-6'>
            {error.message ||
              'An unexpected error occurred while loading the game.'}
          </p>
          <div className='flex gap-4 justify-center'>
            <button
              onClick={reset}
              className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
            >
              Try again
            </button>
            <Link
              href='/'
              className='px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors'
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
