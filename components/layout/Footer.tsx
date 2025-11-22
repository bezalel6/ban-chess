import Link from 'next/link';
import { Github, Coffee } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-foreground-muted">
          <span>made by RNDev</span>
          <div className="flex items-center space-x-3">
            <Link
              href="https://github.com/bezalel6/ban-chess"
              className="text-foreground-muted hover:text-foreground transition-colors flex items-center space-x-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </Link>
            <Link
              href="https://buymeacoffee.com/rndev"
              className="text-foreground-muted hover:text-foreground transition-colors flex items-center space-x-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee className="h-4 w-4" />
              <span>Buy Me a Coffee</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}