"use client";

import Link from "next/link";
import { useState, useTransition, useEffect, useRef } from "react";
import { Search, LogOut, User, Shield, ChevronRight, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "next-auth/react";
import MobileMenu from "./MobileMenu";
import Image from "next/image";
import { useUserRole } from "@/contexts/UserRoleContext";
import VolumeControl from "./VolumeControl";
import HeadsetMode from "./HeadsetMode";

function UserMenu({ user }: { user: { username?: string; userId?: string; provider?: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDifficultySubmenu, setShowDifficultySubmenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { banDifficulty, setBanDifficulty } = useUserRole();
  const isAnonymous = user?.provider === 'guest';

  const handleSignOut = () => {
    startTransition(() => {
      signOut({ callbackUrl: "/" });
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowDifficultySubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDifficultySubmenu) {
          setShowDifficultySubmenu(false);
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, showDifficultySubmenu]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors"
        >
          <div className={`w-8 h-8 ${isAnonymous ? 'bg-gray-500' : 'bg-lichess-orange-500'} rounded-full flex items-center justify-center`}>
            <span className="text-xs font-bold text-white">
              {isAnonymous ? "?" : (user.username?.slice(0, 2).toUpperCase() || "U")}
            </span>
          </div>
          <span className="text-sm font-medium">
            {isAnonymous ? "Anonymous" : (user.username || "User")}
          </span>
          <div
            className="w-2 h-2 bg-green-500 rounded-full ml-1"
            title="Online"
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 w-56 bg-background-secondary border border-border rounded-lg shadow-lg py-3 z-50 mt-2">
            {/* Only show Profile link for registered users (not guests) */}
            {user.userId && (
              <>
                <Link
                  href={`/user/${user.username || "profile"}`}
                  className="flex items-center px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
                <button
                  onClick={() => setShowDifficultySubmenu(!showDifficultySubmenu)}
                  className="flex items-center justify-between w-full px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors"
                >
                  <span className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Ban Harshness
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showDifficultySubmenu ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Difficulty Submenu */}
                {showDifficultySubmenu && (
                  <div className="ml-4 border-l-2 border-border">
                    <button
                      onClick={() => {
                        setBanDifficulty('easy');
                        setShowDifficultySubmenu(false);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-5 py-2 text-sm hover:bg-background-tertiary transition-colors ${
                        banDifficulty === 'easy' ? 'text-green-500' : 'text-foreground'
                      }`}
                    >
                      <span>Easy</span>
                      {banDifficulty === 'easy' && <Check className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setBanDifficulty('medium');
                        setShowDifficultySubmenu(false);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-5 py-2 text-sm hover:bg-background-tertiary transition-colors ${
                        banDifficulty === 'medium' ? 'text-orange-500' : 'text-foreground'
                      }`}
                    >
                      <span>Medium</span>
                      {banDifficulty === 'medium' && <Check className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setBanDifficulty('hard');
                        setShowDifficultySubmenu(false);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-5 py-2 text-sm hover:bg-background-tertiary transition-colors ${
                        banDifficulty === 'hard' ? 'text-red-500' : 'text-foreground'
                      }`}
                    >
                      <span>Hard</span>
                      {banDifficulty === 'hard' && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                )}
                <div className="border-t border-border my-1"></div>
              </>
            )}
            {isAnonymous ? (
              <Link
                href="/auth/signin"
                className="flex items-center w-full px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Sign in
              </Link>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={isPending}
                className="flex items-center w-full px-5 py-3 text-sm text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isPending ? "Signing out..." : "Sign out"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SearchButton() {
  return (
    <button className="p-3 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors">
      <Search className="h-4 w-4" />
    </button>
  );
}

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center">
          {/* Logo - Left side */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="BanChess Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-bold">
                <span className="text-lichess-orange-500">Ban</span>
                <span className="text-foreground">Chess</span>
              </span>
            </Link>
          </div>

          {/* Main Navigation - Desktop - Absolutely centered */}
          <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center space-x-2">
            <Link
              href="/play"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all"
            >
              Play
            </Link>
            <Link
              href="/play/practice"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all"
            >
              Practice
            </Link>
            <Link
              href="/play/online"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-lichess-orange-500 hover:bg-background-secondary rounded-lg transition-all"
            >
              Online
            </Link>
          </nav>

          {/* User Actions - Right side */}
          <div className="flex items-center space-x-3 ml-auto">
            <SearchButton />
            <VolumeControl />
            <HeadsetMode />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href="/auth/signin"
                className="px-5 py-2.5 bg-lichess-orange-500 hover:bg-lichess-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
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
