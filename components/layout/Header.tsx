'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Search, LogOut, Settings, User, Volume2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from 'next-auth/react';
import MobileMenu from './MobileMenu';
import Image from 'next/image';

function UserMenu({ user }: { user: { username?: string; userId?: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOut({ callbackUrl: '/' });
    });
  };

  return (
    <div className='relative'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center space-x-2 px-4 py-2.5 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors'
      >
        <div className='w-8 h-8 bg-lichess-orange-500 rounded-full flex items-center justify-center'>
          <span className='text-xs font-bold text-white'>
            {user.username?.slice(0, 2).toUpperCase() || 'U'}
          </span>
        </div>
        <span className='text-sm font-medium'>{user.username || 'User'}</span>
        <div
          className='w-2 h-2 bg-green-500 rounded-full ml-1'
          title='Online'
        />
      </button>

      {isOpen && (
        <div className='absolute top-full right-0 w-56 bg-background-secondary border border-border rounded-lg shadow-lg py-3 z-50 mt-2'>
          {/* Only show Profile link for registered users (not guests) */}
          {user.userId && (
            <>
              <Link
                href={`/user/${user.username || 'profile'}`}
                className='flex items-center px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors'
                onClick={() => setIsOpen(false)}
              >
                <User className='h-4 w-4 mr-2' />
                Profile
              </Link>
              <Link
                href='/settings'
                className='flex items-center px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors'
                onClick={() => setIsOpen(false)}
              >
                <Settings className='h-4 w-4 mr-2' />
                Settings
              </Link>
              <div className='border-t border-border my-1'></div>
            </>
          )}
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className='flex items-center w-full px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50'
          >
            <LogOut className='h-4 w-4 mr-2' />
            {isPending ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

function SearchButton() {
  return (
    <button className='p-3 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors'>
      <Search className='h-4 w-4' />
    </button>
  );
}

export default function Header() {
  const { user } = useAuth();

  return (
    <header className='border-b border-border bg-background sticky top-0 z-50'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex h-20 items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center space-x-4'>
            <Link
              href='/'
              className='flex items-center space-x-2 hover:opacity-80 transition-opacity'
            >
              <Image
                src='/logo.png'
                alt='BanChess Logo'
                width={48}
                height={48}
                className='object-contain'
              />
              <span className='text-2xl font-bold'>
                <span className='text-lichess-orange-500'>Ban</span>
                <span className='text-foreground'>Chess</span>
              </span>
            </Link>
          </div>

          {/* Main Navigation - Desktop */}
          <nav className='hidden md:flex items-center space-x-2'>
            <Link
              href='/play/local'
              className='px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all'
            >
              Play Solo
            </Link>
            <Link
              href='/play/online'
              className='px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all'
            >
              Play Online
            </Link>
            <Link
              href='/analysis'
              className='px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all'
            >
              Analysis
            </Link>
          </nav>

          {/* User Actions */}
          <div className='flex items-center space-x-3'>
            <SearchButton />
            <Link
              href='/sound-settings'
              className='relative p-3 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors group'
              title='Sound Settings'
            >
              <div className='flex items-center gap-1'>
                <Volume2 className='h-4 w-4' />
                <Settings className='h-3 w-3 text-foreground-muted/70 group-hover:text-foreground/70' />
              </div>
            </Link>
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href='/auth/signin'
                className='px-5 py-2.5 bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white rounded-lg transition-colors text-sm font-medium'
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
