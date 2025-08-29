'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Search, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from 'next-auth/react';
import MobileMenu from './MobileMenu';
import Image from 'next/image'; // Add this import

interface NavigationDropdownProps {
  label: string;
  items: { label: string; href: string; description?: string }[];
}

function NavigationDropdown({ label, items }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      
      {isOpen && (
        <div
          className="absolute top-full left-0 w-64 bg-background-secondary border border-border rounded-lg shadow-lg py-2 z-50 mt-1"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-foreground hover:bg-background-tertiary hover:text-lichess-orange-500 transition-colors"
            >
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-xs text-foreground-muted">{item.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: { username?: string; userId?: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOut({ callbackUrl: '/' });
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1 bg-background-secondary rounded-md hover:bg-background-tertiary transition-colors"
      >
        <div className="w-6 h-6 bg-lichess-orange-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {user.username?.slice(0, 2).toUpperCase() || 'U'}
          </span>
        </div>
        <span className="text-sm font-medium">{user.username || 'User'}</span>
        <div className="w-2 h-2 bg-green-500 rounded-full ml-1" title="Online" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 w-48 bg-background-secondary border border-border rounded-lg shadow-lg py-2 z-50 mt-1">
          <Link
            href={`/user/${user.username || 'profile'}`}
            className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-background-tertiary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
          <Link
            href="/settings"
            className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-background-tertiary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
          <div className="border-t border-border my-1"></div>
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isPending ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

function SearchButton() {
  return (
    <button className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-md transition-colors">
      <Search className="h-4 w-4" />
    </button>
  );
}

const playMenuItems = [
  { label: 'Quick pairing', href: '/play/quick', description: 'Find an opponent instantly' },
  { label: 'Play with a friend', href: '/play/friend', description: 'Challenge someone you know' },
  { label: 'Play the computer', href: '/play/computer', description: 'Practice against AI' },
  { label: 'Tournaments', href: '/tournaments', description: 'Compete in organized events' },
];

const learnMenuItems = [
  { label: 'Chess basics', href: '/learn/basics', description: 'Learn how to play chess' },
  { label: 'Ban Chess rules', href: '/learn/ban-chess', description: 'Understand the variant' },
  { label: 'Practice', href: '/practice', description: 'Improve your skills' },
  { label: 'Puzzles', href: '/puzzles', description: 'Solve tactical problems' },
];

const toolsMenuItems = [
  { label: 'Analysis board', href: '/analysis', description: 'Analyze positions and games' },
  { label: 'Board editor', href: '/editor', description: 'Set up custom positions' },
  { label: 'Import game', href: '/import', description: 'Import PGN or FEN' },
];

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="Ban Chess Logo"
                width={40} // Adjust as needed
                height={40} // Adjust as needed
              />
              <span className="text-xl font-bold text-foreground">Ban Chess</span>
            </Link>
          </div>

          {/* Main Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavigationDropdown label="Play" items={playMenuItems} />
            <NavigationDropdown label="Learn" items={learnMenuItems} />
            <NavigationDropdown label="Tools" items={toolsMenuItems} />
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <SearchButton />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link 
                href="/auth/signin"
                className="px-4 py-2 bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white rounded-md transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
            )}
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}