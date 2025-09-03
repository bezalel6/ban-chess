"use client";

import { Music, Wand2, RotateCcw, MousePointer, X, Play } from "lucide-react";
import React, { useState, useEffect } from "react";
import soundManager, { eventTypes, eventMetadata, type EventType } from "@/lib/sound-manager";

interface SoundLibrary {
  themes: Record<string, Array<{ file: string; name: string; displayName: string }>>;
}

interface SettingsClientProps {
  initialSoundLibrary: SoundLibrary;
  isAdmin?: boolean;
}

export default function SettingsClient({ initialSoundLibrary, isAdmin = false }: SettingsClientProps) {
  // Sound settings state - initialize with defaults to avoid hydration mismatch
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [eventSoundMap, setEventSoundMap] = useState<Record<EventType, string | null>>({} as Record<EventType, string | null>);
  
  // Sound exploration state - initialize with server data
  const [soundLibrary] = useState<SoundLibrary>(initialSoundLibrary);
  const [activeTheme, setActiveTheme] = useState<string>("standard");
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Admin mode state
  const [editingGlobalDefaults, setEditingGlobalDefaults] = useState(false);
  const [savingGlobalDefaults, setSavingGlobalDefaults] = useState(false);
  const [savedUserPrefs, setSavedUserPrefs] = useState<{
    enabled: boolean;
    volume: number;
    eventMap: Record<EventType, string | null>;
  } | null>(null);
  
  // Simple assignment state - no persistent selections
  const [pendingAssignment, setPendingAssignment] = useState<{
    soundFile: string;
    soundName: string;
  } | null>(null);

  // No need to load sound library - it's passed as props from server

  // Handle mode switching between personal and global settings
  const handleModeSwitch = (toGlobalMode: boolean) => {
    if (toGlobalMode && isAdmin) {
      // Save current personal settings before switching
      setSavedUserPrefs({
        enabled: soundEnabled,
        volume: soundManager.getVolume(),
        eventMap: { ...eventSoundMap }
      });
      
      // Load global settings
      fetch('/api/admin/global-settings')
        .then(res => res.json())
        .then(globalSettings => {
          setSoundEnabled(globalSettings.soundEnabled ?? true);
          soundManager.setVolume(globalSettings.soundVolume || 0.5);
          soundManager.setEnabled(globalSettings.soundEnabled ?? true);
          
          // Clear and apply global event sounds
          const newEventMap: Record<EventType, string | null> = {} as Record<EventType, string | null>;
          eventTypes.forEach(event => {
            newEventMap[event] = null;
          });
          
          if (globalSettings.eventSoundMap) {
            Object.entries(globalSettings.eventSoundMap).forEach(([event, soundPath]) => {
              if (soundPath) {
                newEventMap[event as EventType] = soundPath as string;
                soundManager.setEventSound(event as EventType, soundPath as string);
              }
            });
          }
          
          setEventSoundMap(newEventMap);
          setEditingGlobalDefaults(true);
        })
        .catch(err => {
          console.error('Failed to load global settings:', err);
        });
    } else if (!toGlobalMode && savedUserPrefs) {
      // Restore personal settings
      setSoundEnabled(savedUserPrefs.enabled);
      soundManager.setVolume(savedUserPrefs.volume);
      soundManager.setEnabled(savedUserPrefs.enabled);
      
      // Restore personal event sounds
      Object.entries(savedUserPrefs.eventMap).forEach(([event, soundPath]) => {
        soundManager.setEventSound(event as EventType, soundPath);
      });
      
      setEventSoundMap(savedUserPrefs.eventMap);
      setSavedUserPrefs(null);
      setEditingGlobalDefaults(false);
    }
  };

  // Load initial preferences after hydration to avoid mismatch
  useEffect(() => {
    // Only run initial setup, not on mode changes
    if (!isHydrated) {
      const hasExistingPrefs = localStorage.getItem('soundPreferences');
      
      if (!hasExistingPrefs) {
        // New user - load global defaults
        fetch('/api/global-settings')
          .then(res => res.json())
          .then(globalSettings => {
            soundManager.setVolume(globalSettings.soundVolume || 0.5);
            soundManager.setEnabled(globalSettings.soundEnabled ?? true);
            
            if (globalSettings.eventSoundMap && Object.keys(globalSettings.eventSoundMap).length > 0) {
              Object.entries(globalSettings.eventSoundMap).forEach(([event, soundPath]) => {
                if (soundPath) {
                  soundManager.setEventSound(event as EventType, soundPath as string);
                }
              });
            }
            
            setSoundEnabled(globalSettings.soundEnabled ?? true);
            setEventSoundMap(soundManager.getEventSoundMap());
          })
          .catch(err => {
            console.error('Failed to fetch global settings:', err);
            setSoundEnabled(soundManager.isEnabled());
            setEventSoundMap(soundManager.getEventSoundMap());
          });
      } else {
        // Existing user - use their preferences
        setSoundEnabled(soundManager.isEnabled());
        setEventSoundMap(soundManager.getEventSoundMap());
      }
      
      setIsHydrated(true);
    }
  }, [isHydrated]);

  // Volume is controlled via header component, not here

  // Play any sound for exploration
  const playSound = async (soundFile: string) => {
    if (!soundEnabled) return;
    
    setIsPlayingSound(soundFile);
    
    // Play the sound directly with current manager volume
    const audio = new Audio(soundFile);
    audio.volume = soundManager.getVolume();
    
    // Just log errors quietly, no special UI handling needed
    audio.play().catch(() => {
      console.warn(`Sound not available: ${soundFile}`);
    });
    
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
    if (!editingGlobalDefaults) {
      // Personal mode - save to localStorage via soundManager
      soundManager.setEventSound(eventType, soundFile);
      setEventSoundMap(soundManager.getEventSoundMap());
    } else {
      // Global mode - update both state and soundManager (but don't save to localStorage)
      const newMap = { ...eventSoundMap };
      newMap[eventType] = soundFile;
      setEventSoundMap(newMap);
      
      // Also update soundManager temporarily so preview plays correct sound
      // This won't save to localStorage since we're not calling setEventSound
      const audio = new Audio(soundFile);
      audio.volume = soundManager.getVolume();
      // Store it for preview purposes
      soundManager['_tempGlobalSounds'] = soundManager['_tempGlobalSounds'] || {};
      soundManager['_tempGlobalSounds'][eventType] = soundFile;
    }
    setPendingAssignment(null); // Clear assignment state
  };

  // Handle event click - either play test sound or complete assignment
  const handleEventClick = (eventType: EventType) => {
    if (pendingAssignment) {
      // Complete assignment
      assignSoundToEvent(eventType, pendingAssignment.soundFile);
    } else if (editingGlobalDefaults) {
      // In global mode, play the sound from our current state
      const soundPath = eventSoundMap[eventType];
      if (soundPath) {
        const audio = new Audio(soundPath);
        audio.volume = soundManager.getVolume();
        audio.onerror = () => {
          console.warn(`Sound not available for ${eventType}: ${soundPath}`);
        };
        audio.play().catch(() => {
          console.warn(`Could not play ${eventType} sound`);
        });
      }
    } else {
      // Personal mode - test current event sound from soundManager
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
  
  // Save global defaults (admin only)
  const saveGlobalDefaults = async () => {
    setSavingGlobalDefaults(true);
    
    try {
      // Save the current customized event sound map
      const res = await fetch('/api/admin/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundEnabled: soundEnabled,
          soundVolume: soundManager.getVolume(),
          eventSoundMap: eventSoundMap // Save the entire custom event-to-sound mapping
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to save global defaults');
      }
      
      // Exit admin mode after save and restore personal settings
      handleModeSwitch(false);
    } catch (err) {
      console.error('Error saving global defaults:', err);
    } finally {
      setSavingGlobalDefaults(false);
    }
  };
  
  // Copy personal settings as global defaults (admin only)
  const copyPersonalAsGlobal = async () => {
    setSavingGlobalDefaults(true);
    
    try {
      // Get current personal settings directly
      const personalSettings = {
        soundEnabled: soundManager.isEnabled(),
        soundVolume: soundManager.getVolume(),
        eventSoundMap: soundManager.getEventSoundMap()
      };
      
      // Save personal settings as global defaults
      const res = await fetch('/api/admin/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalSettings)
      });
      
      if (!res.ok) {
        throw new Error('Failed to copy settings as global defaults');
      }
      
      // Optional: Show success feedback
      console.log('Successfully copied personal settings as global defaults');
    } catch (err) {
      console.error('Error copying settings:', err);
    } finally {
      setSavingGlobalDefaults(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {editingGlobalDefaults ? 'Global Default Sound Settings' : 'Sound Settings'}
        </h1>
        
        {/* Admin controls */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            {editingGlobalDefaults ? (
              <>
                <button
                  onClick={() => handleModeSwitch(false)}
                  className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Back to Personal Settings
                </button>
                <button
                  onClick={saveGlobalDefaults}
                  disabled={savingGlobalDefaults}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {savingGlobalDefaults ? 'Saving...' : 'Save as Global Defaults'}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleModeSwitch(true)}
                  className="px-4 py-2 text-sm bg-lichess-orange-500 hover:bg-lichess-orange-600 rounded-lg transition-colors"
                >
                  Edit Global Defaults
                </button>
                <button
                  onClick={copyPersonalAsGlobal}
                  disabled={savingGlobalDefaults}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                  title="Copy your current personal settings as the global defaults"
                >
                  Use My Settings as Default
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin mode notice */}
      {editingGlobalDefaults && (
        <div className="bg-blue-600/20 border border-blue-600/50 rounded-lg p-4">
          <p className="text-sm">
            You are editing the global default settings. These will be applied to all new users and guests.
          </p>
        </div>
      )}

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

              {/* Dense Sound Grid - Simple and Readable */}
              <div className="bg-gradient-to-br from-background-secondary to-background rounded-lg p-4 border border-gray-600" 
                style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {soundLibrary && (
                  <div className="grid gap-2" 
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'
                    }}>
                    {(soundLibrary.themes[activeTheme] || []).map((sound) => {
                      const isPlaying = isPlayingSound === sound.file;
                      
                      return (
                        <div
                          key={sound.file}
                          className="relative group"
                        >
                          <button
                            onClick={() => playSound(sound.file)}
                            disabled={!soundEnabled}
                            className={`
                              w-full h-full p-3 rounded
                              border-2 transition-all duration-200
                              flex flex-col items-center justify-center gap-1
                              min-h-[80px]
                              ${isPlaying 
                                ? 'bg-lichess-orange-500/20 border-lichess-orange-500 scale-105' 
                                : 'bg-background-secondary border-gray-700 hover:bg-background hover:border-gray-600'
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                          >
                            {/* Play icon on hover */}
                            <Play className={`
                              h-4 w-4 mb-1 transition-opacity
                              ${isPlaying ? 'text-lichess-orange-500' : 'text-gray-400'}
                              ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `} />
                            
                            {/* Sound name - large and readable */}
                            <span className={`
                              text-center font-semibold leading-tight
                              ${isPlaying ? 'text-lichess-orange-500' : 'text-foreground'}
                            `}
                            style={{
                              fontSize: sound.displayName.length > 12 ? '12px' : '14px',
                              wordBreak: 'break-word'
                            }}>
                              {sound.displayName}
                            </span>
                          </button>
                          
                          {/* Assign button */}
                          <button
                            onClick={() => startAssignment(sound.file, sound.displayName)}
                            disabled={!soundEnabled}
                            className="
                              absolute -top-2 -right-2 
                              w-6 h-6 rounded-full
                              bg-lichess-orange-500 text-white
                              opacity-0 group-hover:opacity-100
                              transition-all duration-200
                              flex items-center justify-center
                              hover:scale-110
                              disabled:opacity-50
                              shadow-lg border border-white/20
                            "
                            title={`Assign ${sound.displayName} to a game event`}
                          >
                            <MousePointer className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                        : editingGlobalDefaults
                        ? 'bg-blue-600/10 hover:bg-blue-600/20 ring-1 ring-blue-600/30'
                        : 'bg-background hover:bg-lichess-orange-500/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      isAssignmentTarget 
                        ? `Assign "${pendingAssignment.soundName}" to ${eventMetadata[eventType].name}`
                        : editingGlobalDefaults
                        ? `Test global default ${eventMetadata[eventType].name} sound`
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
              <div className={`mt-4 p-3 rounded-lg ${editingGlobalDefaults ? 'bg-blue-600/10 border border-blue-600/30' : 'bg-background'}`}>
                <p className="text-sm text-foreground-muted">
                  <strong>Current mode:</strong> {editingGlobalDefaults 
                    ? 'Editing global defaults - Click any game event to test the global sound being set.' 
                    : 'Click any game event to test its current sound.'} 
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