"use client";

import { User, Volume2, Play } from "lucide-react";
import type { AuthSession } from "@/types/auth";
import { useState, useEffect } from "react";
import soundManager, {
  eventTypes,
  eventMetadata,
  availableSounds,
  type EventType,
} from "@/lib/sound-manager";

interface SettingsClientProps {
  session: AuthSession;
}

export default function SettingsClient({ session }: SettingsClientProps) {
  const { user } = session;
  const isGuest = user.provider === "guest";

  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [eventSoundMap, setEventSoundMap] = useState(
    soundManager.getEventSoundMap()
  );

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

  const handleSoundToggle = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
  };

  const handleEventSoundChange = (
    eventType: EventType,
    soundFile: string | null
  ) => {
    soundManager.setEventSound(eventType, soundFile);
    setEventSoundMap(soundManager.getEventSoundMap());
  };

  const testSound = (eventType: EventType) => {
    soundManager.playEvent(eventType);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Section */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-lichess-orange-500" />
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium">Username</p>
            <p className="text-sm text-foreground-muted">
              {user.username || "Unknown"}
            </p>
          </div>
          <div>
            <p className="font-medium">Account Type</p>
            <p className="text-sm text-foreground-muted">
              {isGuest ? "Guest Account" : "Registered"}
            </p>
          </div>
          {isGuest && (
            <div className="mt-4 p-4 bg-lichess-orange-500/10 rounded-lg">
              <p className="text-sm text-foreground-muted mb-3">
                Guest accounts are temporary. Sign in to save your games and
                preferences.
              </p>
              <a
                href="/auth/signin"
                className="inline-block px-4 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors text-sm"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-lichess-orange-500" />
          Sound Settings
        </h2>

        <div className="space-y-6">
          {/* Master Sound Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Sound Effects</p>
              <p className="text-sm text-foreground-muted">
                Turn all game sounds on or off
              </p>
            </div>
            <button
              onClick={handleSoundToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundEnabled ? "bg-lichess-orange-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">Volume</p>
              <span className="text-sm text-foreground-muted">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
              disabled={!soundEnabled}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: soundEnabled
                  ? `linear-gradient(to right, rgb(251 127 36) 0%, rgb(251 127 36) ${
                      volume * 100
                    }%, rgb(55 65 81) ${volume * 100}%, rgb(55 65 81) 100%)`
                  : undefined,
              }}
            />
          </div>

          {/* Event Sound Mapping */}
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-1">Event Sounds</p>
              <p className="text-sm text-foreground-muted mb-4">
                Customize which sound plays for each game event
              </p>
            </div>

            <div className="space-y-3">
              {eventTypes.map((eventType) => {
                const EventIcon = eventMetadata[eventType].icon;
                return (
                  <div
                    key={eventType}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg"
                  >
                    <EventIcon className="h-4 w-4 text-foreground-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {eventMetadata[eventType].name}
                      </p>
                    </div>
                    <select
                      value={eventSoundMap[eventType] || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? null : e.target.value;
                        handleEventSoundChange(eventType, value);
                      }}
                      disabled={!soundEnabled}
                      className="px-3 py-1.5 bg-background-secondary border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-lichess-orange-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                    >
                      {availableSounds.map((sound) => (
                        <option
                          key={sound.file || "none"}
                          value={sound.file || ""}
                        >
                          {sound.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => testSound(eventType)}
                      disabled={!soundEnabled || !eventSoundMap[eventType]}
                      className="p-1.5 text-foreground-muted hover:text-lichess-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Test sound"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
