"use client";

import { Music, Wand2, RotateCcw, MousePointer, X, Volume2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

type SoundItem = { file: string; name: string; displayName: string };

interface MasonryProps {
  items: SoundItem[];
  columnGutter: number;
  columnWidth: number;
  overscanBy: number;
  render: (props: { data: SoundItem; index: number }) => React.ReactElement;
}

// Masonic must be loaded client-side only due to browser dependencies
const Masonry = dynamic(
  () => import("masonic").then((mod) => mod.Masonry) as unknown as Promise<React.ComponentType<MasonryProps>>,
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lichess-orange-500 mx-auto mb-2"></div>
          Loading sounds...
        </div>
      </div>
    )
  }
) as React.ComponentType<MasonryProps>;

import soundManager, { eventTypes, eventMetadata, type EventType } from "@/lib/sound-manager";

interface SoundLibrary {
  themes: Record<string, Array<{ file: string; name: string; displayName: string }>>;
}

interface SettingsClientProps {
  initialSoundLibrary: SoundLibrary;
}

export default function SettingsClient({ initialSoundLibrary }: SettingsClientProps) {
  // Sound settings state - initialize with defaults to avoid hydration mismatch
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [eventSoundMap, setEventSoundMap] = useState<Record<EventType, string | null>>({} as Record<EventType, string | null>);
  
  // Sound exploration state - initialize with server data
  const [soundLibrary] = useState<SoundLibrary>(initialSoundLibrary);
  const [activeTheme, setActiveTheme] = useState<string>("standard");
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Simple assignment state - no persistent selections
  const [pendingAssignment, setPendingAssignment] = useState<{
    soundFile: string;
    soundName: string;
  } | null>(null);

  // No need to load sound library - it's passed as props from server

  // Load initial preferences after hydration to avoid mismatch
  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled());
    setEventSoundMap(soundManager.getEventSoundMap());
    setIsHydrated(true);
  }, []);

  // Volume is controlled via header component, not here

  // Play any sound for exploration
  const playSound = async (soundFile: string) => {
    if (!soundEnabled) return;
    
    setIsPlayingSound(soundFile);
    
    // Play the sound directly with current manager volume
    const audio = new Audio(soundFile);
    audio.volume = soundManager.getVolume();
    audio.play().catch(err => console.error("Failed to play sound:", err));
    
    // Clear playing state after a short delay
    setTimeout(() => setIsPlayingSound(null), 1000);
  };

  // Start assignment process - prepare to assign sound to next clicked event
  const startAssignment = (soundFile: string, soundName: string) => {
    setPendingAssignment({ soundFile, soundName });
  };

  // Cancel assignment
  const cancelAssignment = () => {
    setPendingAssignment(null);
  };

  // Assign sound to event - immediate assignment
  const assignSoundToEvent = (eventType: EventType, soundFile: string) => {
    soundManager.setEventSound(eventType, soundFile);
    setEventSoundMap(soundManager.getEventSoundMap());
    setPendingAssignment(null); // Clear assignment state
  };

  // Handle event click - either play test sound or complete assignment
  const handleEventClick = (eventType: EventType) => {
    if (pendingAssignment) {
      // Complete assignment
      assignSoundToEvent(eventType, pendingAssignment.soundFile);
    } else {
      // Test current event sound
      soundManager.playEvent(eventType);
    }
  };

  // Reset all event sounds to defaults
  const resetToDefaults = () => {
    // Reset to standard theme sounds
    soundManager.changeSoundTheme("standard");
    setEventSoundMap(soundManager.getEventSoundMap());
  };

  // Sort themes alphabetically and categorize them
  const allThemes = Object.keys(soundLibrary.themes).sort();
  
  // Separate Lichess themes from other sources
  const lichessThemes = allThemes.filter(theme => 
    // These are Lichess themes
    theme !== 'yoinks' && theme !== 'demo' && theme !== 'alternative' && theme !== 'custom' && theme !== 'user'
  );
  
  // Other themes - yoinks from external source
  const otherThemes = allThemes.filter(theme => 
    theme === 'yoinks'
  );
  
  // Count total sound effects across all Lichess themes
  const totalLichessSounds = lichessThemes.reduce((total, theme) => 
    total + (soundLibrary.themes[theme]?.length || 0), 0);
  
  // Helper function to extract theme from sound path
  const getThemeFromSoundPath = (soundPath: string | null): string | null => {
    if (!soundPath) return null;
    
    // Check if it's an external URL (yoinks)
    if (soundPath.includes('chesscomfiles.com')) {
      return 'yoinks';
    }
    
    // Extract theme from local path: /sounds/[theme]/...
    const match = soundPath.match(/\/sounds\/([^/]+)\//);
    return match ? match[1] : null;
  };
  
  // Helper function to get theme display color
  const getThemeColor = (theme: string | null): string => {
    if (!theme) return 'text-foreground-muted';
    if (theme === 'yoinks') return 'text-[rgb(93,153,72)]';
    return 'text-lichess-orange-500/70';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sound Settings</h1>

      {/* Sound Explorer and Event Customization */}
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="space-y-6">

          {/* Assignment Status Banner */}
          {pendingAssignment && (
            <div className="bg-lichess-orange-500/20 border border-lichess-orange-500/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MousePointer className="h-5 w-5 text-lichess-orange-500" />
                <div>
                  <p className="font-medium text-lichess-orange-500">
                    Ready to assign: {pendingAssignment.soundName}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Click any game event below to assign this sound to it
                  </p>
                </div>
              </div>
              <button
                onClick={cancelAssignment}
                className="p-2 hover:bg-lichess-orange-500/20 rounded-lg transition-colors"
                title="Cancel assignment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Sound Explorer */}
          {soundLibrary && (
            <div>
              <div className="mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Music className="h-4 w-4 text-foreground-muted" />
                  Sound Explorer
                </h3>
              </div>

              {/* Theme Tabs - Grouped and Labeled */}
              <div className="flex gap-3 mb-4">
                {/* Lichess Themes Section - Primary/Preferred */}
                <div className="flex-1 border border-lichess-orange-500/30 rounded-lg p-3 bg-lichess-orange-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-foreground font-medium">
                      {totalLichessSounds} sound effects from
                    </p>
                    <a 
                      href="https://lichess.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-lichess-orange-500 bg-lichess-orange-500/20 px-3 py-0.5 rounded font-bold hover:bg-lichess-orange-500/30 transition-colors"
                    >
                      Lichess.org ❤️
                    </a>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {lichessThemes.map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setActiveTheme(theme)}
                        disabled={!soundEnabled}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                          activeTheme === theme
                            ? 'bg-lichess-orange-500 text-white shadow-lg'
                            : 'bg-background hover:bg-lichess-orange-500/20 border border-lichess-orange-500/20'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Other Themes Section - Yoinks */}
                {otherThemes.length > 0 && (
                  <div className="border border-[rgb(93,153,72)]/30 rounded-lg p-3 bg-[rgb(93,153,72)]/5">
                    <div className="mb-2">
                      <p className="text-xs text-gray-400 font-medium">
                        External sounds
                      </p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {otherThemes.map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setActiveTheme(theme)}
                          disabled={!soundEnabled} 
                          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                            activeTheme === theme
                              ? 'bg-[rgb(93,153,72)] text-white shadow-lg'
                              : 'bg-background hover:bg-[rgb(93,153,72)]/20 border border-[rgb(93,153,72)]/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Yoinks
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Brick Wall Grid - No Scrolling, Tight Packed */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 border border-gray-600">
                <div style={{ height: '400px' }}>
                  {isHydrated && (
                    <Masonry
                    items={soundLibrary.themes[activeTheme] || []}
                    columnGutter={4}
                    columnWidth={120}
                    overscanBy={0}
                    render={({ data: sound, index }) => {
                      const isPlaying = isPlayingSound === sound.file;
                      
                      // Calculate brick height based on text length for natural variation
                      const textLength = sound.displayName.length;
                      const brickHeight = textLength <= 8 ? 50 : 
                                         textLength <= 12 ? 60 : 
                                         textLength <= 16 ? 70 : 80;
                      
                      // Lighter, more vibrant colors for bricks
                      const brickColors = [
                        'bg-amber-600',
                        'bg-orange-600', 
                        'bg-red-600',
                        'bg-rose-600',
                        'bg-pink-600',
                        'bg-purple-600',
                        'bg-indigo-600',
                        'bg-blue-600',
                        'bg-cyan-600',
                        'bg-teal-600',
                        'bg-green-600',
                        'bg-lime-600'
                      ];
                      const brickColor = brickColors[index % brickColors.length];
                      
                      return (
                        <div 
                          key={sound.file} 
                          className="relative group"
                          style={{ height: `${brickHeight}px` }}
                        >
                          <button
                            onClick={() => playSound(sound.file)}
                            disabled={!soundEnabled}
                            className={`w-full h-full px-2 py-1 rounded-sm transition-all duration-200 flex items-center justify-center relative overflow-hidden border-2 ${
                              isPlaying 
                                ? 'bg-lichess-orange-500 border-lichess-orange-300 shadow-lg scale-105 z-10' 
                                : `${brickColor} border-gray-800 hover:border-gray-600 hover:brightness-110`
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            style={{
                              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                            }}
                            title={`Click to play: ${sound.displayName}`}
                          >
                            {/* Brick texture effect */}
                            <div className="absolute inset-0 opacity-20" style={{
                              background: `repeating-linear-gradient(
                                90deg,
                                transparent,
                                transparent 2px,
                                rgba(0,0,0,0.1) 2px,
                                rgba(0,0,0,0.1) 4px
                              )`
                            }} />
                            
                            {/* Playing indicator */}
                            {isPlaying && (
                              <Volume2 className="absolute top-1 right-1 h-3 w-3 text-white animate-pulse" />
                            )}
                            
                            {/* Text - large and readable */}
                            <span className={`text-center font-bold relative z-10 text-white leading-tight`}
                            style={{
                              fontSize: textLength <= 10 ? '16px' : 
                                       textLength <= 15 ? '14px' : '12px',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {sound.displayName}
                            </span>
                          </button>
                          
                          {/* Assign Button - smaller, corner positioned */}
                          <button
                            onClick={() => startAssignment(sound.file, sound.displayName)}
                            disabled={!soundEnabled}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-lichess-orange-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:scale-110 disabled:opacity-50 z-20 border border-white shadow-lg"
                            title={`Assign ${sound.displayName} to a game event`}
                          >
                            <MousePointer className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    }}
                  />
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-3 p-3 bg-background rounded-lg">
                <p className="text-sm text-foreground-muted">
                  <strong>How to use:</strong> Click any sound to preview it. 
                  To customize game events: hover over a sound and click the 
                  <MousePointer className="inline h-3 w-3 mx-1" /> 
                  button, then click the game event you want to assign it to.
                </p>
              </div>
            </div>
          )}

          {/* Game Event Sounds */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-foreground-muted" />
                Game Event Sounds
              </h3>
              <button
                onClick={resetToDefaults}
                disabled={!soundEnabled}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset all event sounds to default"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Defaults
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {eventTypes.map((eventType) => {
                const EventIcon = eventMetadata[eventType].icon;
                const currentSound = eventSoundMap[eventType];
                const isAssignmentTarget = pendingAssignment !== null;
                
                return (
                  <button
                    key={eventType}
                    onClick={() => handleEventClick(eventType)}
                    disabled={!soundEnabled}
                    className={`w-full p-3 rounded-lg transition-all min-h-[100px] ${
                      isAssignmentTarget
                        ? 'bg-lichess-orange-500/10 hover:bg-lichess-orange-500/20 ring-1 ring-lichess-orange-500/50 cursor-pointer'
                        : 'bg-background hover:bg-lichess-orange-500/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      isAssignmentTarget 
                        ? `Assign "${pendingAssignment.soundName}" to ${eventMetadata[eventType].name}`
                        : `Test ${eventMetadata[eventType].name} sound`
                    }
                  >
                    <EventIcon className="h-5 w-5 mb-1 mx-auto text-foreground-muted" />
                    <p className="text-xs font-medium">{eventMetadata[eventType].name}</p>
                    {currentSound && isHydrated && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-[10px] text-foreground-muted truncate">
                          {currentSound.split('/').pop()?.replace('.mp3', '')}
                        </p>
                        {(() => {
                          const theme = getThemeFromSoundPath(currentSound);
                          return theme ? (
                            <p className={`text-[9px] font-medium ${getThemeColor(theme)}`}>
                              {theme === 'yoinks' ? 'Yoinks' : theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {isAssignmentTarget && (
                      <div className="mt-1 flex items-center justify-center">
                        <MousePointer className="h-3 w-3 text-lichess-orange-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!pendingAssignment && (
              <div className="mt-4 p-3 bg-background rounded-lg">
                <p className="text-sm text-foreground-muted">
                  <strong>Current mode:</strong> Click any game event to test its current sound. 
                  To change sounds, use the assignment button on any sound above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}