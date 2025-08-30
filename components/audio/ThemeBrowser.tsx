'use client';

import { useState, useEffect } from 'react';
import { Volume2, Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import {
  soundThemes,
  themeMetadata,
  getSoundPath,
  getThemeSounds,
  type SoundTheme,
} from '@/lib/sound-themes';
import soundManager from '@/lib/sound-manager';

interface ThemeBrowserProps {
  onThemeSelect?: (theme: SoundTheme) => void;
}

export default function ThemeBrowser({ onThemeSelect }: ThemeBrowserProps) {
  const [selectedTheme, setSelectedTheme] = useState<SoundTheme>('standard');
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isPirateUnlocked, setIsPirateUnlocked] = useState(false);

  const themesPerPage = 8;

  // Filter out locked themes
  const availableThemes = soundThemes.filter(theme => {
    const meta = themeMetadata[theme];
    if (meta.unlockable && theme === 'pirate') {
      return isPirateUnlocked;
    }
    return true;
  });

  const totalPages = Math.ceil(availableThemes.length / themesPerPage);

  const currentThemes = availableThemes.slice(
    currentPage * themesPerPage,
    (currentPage + 1) * themesPerPage
  );

  // Load saved theme and check pirate unlock status on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedSoundTheme') as SoundTheme;
    if (savedTheme && soundThemes.includes(savedTheme)) {
      setSelectedTheme(savedTheme);
    }

    // Check if pirate theme is unlocked
    const pirateRevealed = localStorage.getItem('pirateRevealed');
    setIsPirateUnlocked(pirateRevealed === 'true');
  }, []);

  const playThemePreview = async (theme: SoundTheme) => {
    if (isPlaying === theme) {
      // Stop playing
      setIsPlaying(null);
      return;
    }

    setIsPlaying(theme);

    // Play a sequence of sounds from this theme
    const soundSequence = ['Move', 'Capture', 'Check'];

    for (const sound of soundSequence) {
      const soundPath = getSoundPath(theme, sound.toLowerCase());
      if (soundPath) {
        const audio = new Audio(soundPath);
        audio.volume = 0.3;
        await new Promise<void>(resolve => {
          audio.addEventListener('ended', () => resolve());
          audio.play().catch(() => resolve());
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setIsPlaying(null);
  };

  const selectTheme = (theme: SoundTheme) => {
    setSelectedTheme(theme);
    localStorage.setItem('selectedSoundTheme', theme);

    // Apply theme sounds to sound manager
    const themeSounds = getThemeSounds(theme);
    for (const [event, soundPath] of Object.entries(themeSounds)) {
      soundManager.setEventSound(event as never, soundPath);
    }

    if (onThemeSelect) {
      onThemeSelect(theme);
    }
  };

  // Listen for pirate unlock events
  useEffect(() => {
    const handleStorageChange = () => {
      const pirateRevealed = localStorage.getItem('pirateRevealed');
      setIsPirateUnlocked(pirateRevealed === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event in same tab
    window.addEventListener('pirateUnlocked', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pirateUnlocked', handleStorageChange);
    };
  }, []);

  const nextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-base font-semibold'>Sound Themes</h3>
        <div className='text-xs text-foreground-muted'>
          Select a complete sound theme or customize individual sounds below
        </div>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
        {currentThemes.map(theme => {
          const meta = themeMetadata[theme];
          const isSelected = selectedTheme === theme;

          return (
            <div
              key={theme}
              className={`relative rounded-lg p-3 border transition-all ${
                isSelected
                  ? 'border-amber-500 bg-background-tertiary shadow-md'
                  : 'border-border hover:border-amber-500/50 bg-background-secondary'
              }`}
            >
              {/* Theme color indicator */}
              <div
                className={`absolute top-0 left-0 w-full h-0.5 rounded-t-lg ${meta.color}`}
              />

              {/* Selected indicator */}
              {isSelected && (
                <div className='absolute top-1.5 right-1.5'>
                  <Check className='h-4 w-4 text-amber-500' />
                </div>
              )}

              {/* Unlockable indicator */}
              {meta.unlockable && (
                <div className='absolute top-1.5 left-1.5'>
                  <Lock className='h-3 w-3 text-amber-500' />
                </div>
              )}

              <div className='flex flex-col items-center space-y-2 mt-1'>
                <h4 className='font-medium text-sm'>{meta.name}</h4>
                <p className='text-xs text-foreground-muted text-center line-clamp-1'>
                  {meta.description}
                </p>

                <div className='flex gap-1 w-full'>
                  <button
                    onClick={() => playThemePreview(theme)}
                    className='flex-1 px-2 py-1.5 text-xs rounded bg-background hover:bg-background-tertiary transition-colors flex items-center justify-center gap-1'
                    disabled={isPlaying !== null && isPlaying !== theme}
                  >
                    <Volume2 className='h-3 w-3' />
                    {isPlaying === theme ? 'Playing' : 'Preview'}
                  </button>

                  <button
                    onClick={() => selectTheme(theme)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-500'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-3 mt-4'>
          <button
            onClick={prevPage}
            className='p-1.5 rounded bg-background-secondary hover:bg-background-tertiary transition-colors'
            aria-label='Previous page'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          <span className='text-xs text-foreground-muted'>
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={nextPage}
            className='p-1.5 rounded bg-background-secondary hover:bg-background-tertiary transition-colors'
            aria-label='Next page'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}
