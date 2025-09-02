"use client";

import { Volume2, Play, Music, Wand2, Info, RotateCcw } from "lucide-react";
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
  const [lastPlayedSound, setLastPlayedSound] = useState<string | null>(null);
  
  // Event customization state (optional)
  const [selectedEventForCustomization, setSelectedEventForCustomization] = useState<EventType | null>(null);
  const [eventMode, setEventMode] = useState<'assign' | 'play'>('assign'); // New state for mode toggle

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
    setLastPlayedSound(soundFile);
    
    // Play the sound directly
    const audio = new Audio(soundFile);
    audio.volume = volume;
    audio.play().catch(err => console.error("Failed to play sound:", err));
    
    // Clear playing state after a short delay
    setTimeout(() => setIsPlayingSound(null), 1000);
  };

  // Assign sound to event
  const assignSoundToEvent = (eventType: EventType, soundFile: string) => {
    soundManager.setEventSound(eventType, soundFile);
    setEventSoundMap(soundManager.getEventSoundMap());
    setSelectedEventForCustomization(null);
  };

  // Quick assign last played sound to an event
  const quickAssignToEvent = (eventType: EventType) => {
    if (lastPlayedSound) {
      assignSoundToEvent(eventType, lastPlayedSound);
    }
  };

  // Reset all event sounds to defaults
  const resetToDefaults = () => {
    // Reset to standard theme sounds
    soundManager.changeSoundTheme("standard");
    setEventSoundMap(soundManager.getEventSoundMap());
  };

  const themeNames = soundLibrary ? Object.keys(soundLibrary.themes) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sound Settings</h1>

      {/* Sound Explorer and Event Customization */}
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="space-y-6">

          {/* Sound Explorer */}
          {soundLibrary && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Music className="h-4 w-4 text-foreground-muted" />
                  Sound Explorer
                </h3>
                
                {/* Integrated Volume Control */}
                <div className="flex items-center gap-4">
                  {lastPlayedSound && (
                    <div className="text-xs text-foreground-muted flex items-center gap-2">
                      <Play className="h-3 w-3" />
                      Last played: {lastPlayedSound.split('/').pop()?.replace('.mp3', '')}
                    </div>
                  )}
                  
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
              </div>

              {/* Theme Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {themeNames.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setActiveTheme(theme)}
                    disabled={!soundEnabled}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      activeTheme === theme
                        ? 'bg-lichess-orange-500 text-white'
                        : 'bg-background hover:bg-lichess-orange-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>

              {/* Sound Grid - Organized in columns */}
              <div className="bg-background rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {soundLibrary.themes[activeTheme]?.map((sound) => {
                    const isPlaying = isPlayingSound === sound.file;
                    const isLastPlayed = lastPlayedSound === sound.file;
                    
                    return (
                      <button
                        key={sound.file}
                        onClick={() => playSound(sound.file)}
                        disabled={!soundEnabled}
                        className={`px-4 py-3 rounded-lg text-sm transition-all relative group flex items-center justify-center gap-2 min-h-[44px] ${
                          isLastPlayed
                            ? 'bg-lichess-orange-500/20 ring-1 ring-lichess-orange-500/50'
                            : 'bg-background-secondary hover:bg-lichess-orange-500/10'
                        } ${
                          isPlaying ? 'animate-pulse bg-lichess-orange-500/30' : ''
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={`Click to play: ${sound.displayName}`}
                      >
                        {isPlaying && (
                          <Play className="h-4 w-4 text-lichess-orange-500 flex-shrink-0" />
                        )}
                        <span className="text-center break-words leading-tight">{sound.displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtle Instructions */}
              <div className="mt-3 flex items-start gap-2 text-xs text-foreground-muted/70">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p>
                  Click any sound to preview it. To assign a sound to a game event, play the sound you like, 
                  then click the event button below.
                </p>
              </div>
            </div>
          )}

          {/* Event Customization (Optional) */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Wand2 className="h-4 w-4 text-foreground-muted" />
                  Game Event Sounds
                </h3>
                <button
                  onClick={() => {
                    setEventMode(eventMode === 'assign' ? 'play' : 'assign');
                    setLastPlayedSound(null);
                    setSelectedEventForCustomization(null);
                  }}
                  className="text-xs text-foreground-muted hover:text-lichess-orange-500 transition-colors"
                >
                  Mode: <span className="font-medium text-lichess-orange-500">
                    {eventMode === 'assign' ? 'Assign sounds to events' : 'Preview event sounds'}
                  </span> (click to toggle)
                </button>
              </div>
              <div className="flex items-center gap-3">
                {eventMode === 'assign' && lastPlayedSound && (
                  <p className="text-xs text-lichess-orange-500">
                    Click any event to assign: {lastPlayedSound.split('/').pop()?.replace('.mp3', '')}
                  </p>
                )}
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
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {eventTypes.map((eventType) => {
                const EventIcon = eventMetadata[eventType].icon;
                const currentSound = eventSoundMap[eventType];
                const isSelected = selectedEventForCustomization === eventType;
                
                return (
                  <div key={eventType} className="relative group">
                    <button
                      onClick={() => {
                        if (eventMode === 'play') {
                          // In play mode, just play the current sound
                          if (currentSound) {
                            playSound(currentSound);
                          }
                        } else {
                          // In assign mode, assign the last played sound or select for assignment
                          if (lastPlayedSound) {
                            quickAssignToEvent(eventType);
                          } else {
                            setSelectedEventForCustomization(eventType);
                          }
                        }
                      }}
                      disabled={!soundEnabled}
                      className={`w-full p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-lichess-orange-500/20 ring-2 ring-lichess-orange-500'
                          : 'bg-background hover:bg-lichess-orange-500/10'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={eventMode === 'play' ? `Play ${eventMetadata[eventType].name} sound` : `Assign sound to ${eventMetadata[eventType].name}`}
                    >
                      <EventIcon className="h-5 w-5 mb-1 mx-auto text-foreground-muted" />
                      <p className="text-xs font-medium">{eventMetadata[eventType].name}</p>
                      {currentSound && (
                        <p className="text-[10px] text-foreground-muted mt-1 truncate">
                          {currentSound.split('/').pop()?.replace('.mp3', '')}
                        </p>
                      )}
                    </button>
                    
                    {/* Quick Play Current Sound - only show in assign mode */}
                    {eventMode === 'assign' && currentSound && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound(currentSound);
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-background-secondary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Play current sound"
                      >
                        <Play className="h-3 w-3 text-foreground-muted" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Alternative Assignment Method - only in assign mode */}
            {eventMode === 'assign' && selectedEventForCustomization && !lastPlayedSound && (
              <div className="mt-4 p-3 bg-lichess-orange-500/10 rounded-lg border border-lichess-orange-500/30">
                <p className="text-xs text-lichess-orange-500">
                  Now play any sound above to assign it to {eventMetadata[selectedEventForCustomization].name}
                </p>
                <button
                  onClick={() => setSelectedEventForCustomization(null)}
                  className="mt-2 text-xs text-foreground-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Auto-assign on next sound play when event is selected - only in assign mode */}
            {eventMode === 'assign' && selectedEventForCustomization && lastPlayedSound && (
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-500 mb-2">
                  Sound assigned to {eventMetadata[selectedEventForCustomization].name}!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add effect to auto-assign when both event and sound are selected
export function useAutoAssign(
  selectedEvent: EventType | null,
  lastPlayedSound: string | null,
  assignSoundToEvent: (event: EventType, sound: string) => void
) {
  useEffect(() => {
    if (selectedEvent && lastPlayedSound) {
      assignSoundToEvent(selectedEvent, lastPlayedSound);
    }
  }, [selectedEvent, lastPlayedSound, assignSoundToEvent]);
}