import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-lichess-orange-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-foreground-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}