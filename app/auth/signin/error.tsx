'use client';

export default function SignInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex items-center justify-center min-h-[60vh]'>
      <div className='w-full max-w-md space-y-4 text-center'>
        <h2 className='text-2xl font-bold text-red-500'>
          Something went wrong!
        </h2>
        <p className='text-muted-foreground'>
          {error.message || 'Failed to load the sign-in page'}
        </p>
        <button
          onClick={reset}
          className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
        >
          Try again
        </button>
      </div>
    </div>
  );
}
