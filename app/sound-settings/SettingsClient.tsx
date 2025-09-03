"use client";

import { Volume2, Play, Music, Wand2, RotateCcw, MousePointer, X } from "lucide-react";
import { useState, useEffect } from "react";
import soundManager, { eventTypes, eventMetadata, type EventType } from "@/lib/sound-manager";

interface SoundLibrary {
  themes: Record<string, Array<{ file: string; name: string; displayName: string }>>;
}

export default function SettingsClient() {
  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [eventSoundMap, setEventSoundMap] = useState(soundManager.getEventSoundMap());
  
  // Sound exploration state
  const [soundLibrary, setSoundLibrary] = useState<SoundLibrary | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("standard");
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  
  // Simple assignment state - no persistent selections
  const [pendingAssignment, setPendingAssignment] = useState<{
    soundFile: string;
    soundName: string;
  } | null>(null);

  // Load sound library from API
  useEffect(() => {
    fetch("/api/sounds")
      .then(res => res.json())
      .then(data => setSoundLibrary(data))
      .catch(err => console.error("Failed to load sound library:", err));
  }, []);

  // Load initial preferences
  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled());
    setVolume(soundManager.getVolume());
    setEventSoundMap(soundManager.getEventSoundMap());
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  // Play any sound for exploration
  const playSound = async (soundFile: string) => {
    if (!soundEnabled) return;
    
    setIsPlayingSound(soundFile);
    
    // Play the sound directly
    const audio = new Audio(soundFile);
    audio.volume = volume;
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
  const allThemes = soundLibrary ? Object.keys(soundLibrary.themes).sort() : [];
  
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
  const totalLichessSounds = soundLibrary 
    ? lichessThemes.reduce((total, theme) => 
        total + (soundLibrary.themes[theme]?.length || 0), 0)
    : 0;

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Music className="h-4 w-4 text-foreground-muted" />
                  Sound Explorer
                </h3>
                
                {/* Integrated Volume Control */}
                <div className="flex items-center gap-3 bg-background rounded-lg px-4 py-2">
                  <Volume2 className={`h-5 w-5 ${soundEnabled ? 'text-lichess-orange-500' : 'text-gray-500'}`} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundEnabled ? volume * 100 : 0}
                    onChange={(e) => {
                      const newVolume = Number(e.target.value) / 100;
                      if (newVolume === 0) {
                        setSoundEnabled(false);
                        soundManager.setEnabled(false);
                      } else {
                        if (!soundEnabled) {
                          setSoundEnabled(true);
                          soundManager.setEnabled(true);
                        }
                        handleVolumeChange(newVolume);
                      }
                    }}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer volume-slider"
                    style={{
                      background: `linear-gradient(to right, rgb(251 127 36) 0%, rgb(251 127 36) ${soundEnabled ? volume * 100 : 0}%, rgb(55 65 81) ${soundEnabled ? volume * 100 : 0}%, rgb(55 65 81) 100%)`,
                    }}
                  />
                  <span className="text-base text-lichess-orange-500 font-medium font-mono w-12 text-right">
                    {soundEnabled ? Math.round(volume * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Theme Tabs - Grouped and Labeled */}
              <div className="flex gap-3 mb-4">
                {/* Lichess Themes Section - Primary/Preferred */}
                <div className="flex-1 border border-lichess-orange-500/30 rounded-lg p-3 bg-lichess-orange-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-foreground font-medium">
                      All {totalLichessSounds} sound effects from
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
                        External sounds (compatibility)
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
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sound Grid - with direct assignment buttons */}
              <div className="bg-background rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2 pt-2">
                  {soundLibrary.themes[activeTheme]?.map((sound) => {
                    const isPlaying = isPlayingSound === sound.file;
                    
                    return (
                      <div key={sound.file} className="relative group">
                        <button
                          onClick={() => playSound(sound.file)}
                          disabled={!soundEnabled}
                          className={`w-full px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                            isPlaying 
                              ? 'animate-pulse bg-lichess-orange-500/30' 
                              : 'bg-background-secondary hover:bg-lichess-orange-500/10'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={`Click to play: ${sound.displayName}`}
                        >
                          {isPlaying && (
                            <Play className="h-4 w-4 text-lichess-orange-500 flex-shrink-0" />
                          )}
                          <span className="text-center break-words leading-tight">{sound.displayName}</span>
                        </button>
                        
                        {/* Assign Button - visible on hover */}
                        <button
                          onClick={() => startAssignment(sound.file, sound.displayName)}
                          disabled={!soundEnabled}
                          className="absolute -top-2 -right-2 p-2 bg-lichess-orange-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-lichess-orange-600 disabled:opacity-50"
                          title={`Assign ${sound.displayName} to a game event`}
                        >
                          <MousePointer className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
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
                    className={`w-full p-3 rounded-lg transition-all ${
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
                    {currentSound && (
                      <p className="text-[10px] text-foreground-muted mt-1 truncate">
                        {currentSound.split('/').pop()?.replace('.mp3', '')}
                      </p>
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