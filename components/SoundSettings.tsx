'use client';

import React, { useState, useEffect } from 'react';
import soundManager, { eventMetadata, availableSounds, type EventType } from '@/lib/sound-manager';
import { X, Volume2, Play } from 'lucide-react';

interface SoundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Group events by category for better organization
const eventCategories = {
  'Game Flow': ['game-invite', 'game-start', 'game-end', 'draw-offer'] as EventType[],
  'Moves': ['move', 'opponent-move', 'capture'] as EventType[],
  'Special Moves': ['castle', 'check', 'promote'] as EventType[],
  'Game Events': ['ban', 'time-warning'] as EventType[],
};

export default function SoundSettings({ isOpen, onClose }: SoundSettingsProps) {
  const [eventSoundMap, setEventSoundMap] = useState<Record<EventType, string | null>>({} as Record<EventType, string | null>);
  const [volume, setVolume] = useState(0.5);
  const [isEnabled, setIsEnabled] = useState(true);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  useEffect(() => {
    // Load current settings
    setEventSoundMap(soundManager.getEventSoundMap());
    setVolume(soundManager.getVolume());
    setIsEnabled(soundManager.isEnabled());
  }, [isOpen]);

  const handleSoundChange = (eventType: EventType, soundFile: string | null) => {
    soundManager.setEventSound(eventType, soundFile);
    setEventSoundMap(soundManager.getEventSoundMap());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
  };

  const playPreview = (soundFile: string | null) => {
    if (soundFile) {
      setPlayingPreview(soundFile);
      const tempSound = new Audio(soundFile);
      tempSound.volume = volume;
      tempSound.play();
      tempSound.addEventListener('ended', () => {
        setPlayingPreview(null);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-b border-slate-700/50">
          <div className="flex items-center justify-between p-5">
            <div>
              <h2 className="text-2xl font-bold text-white">Sound Settings</h2>
              <p className="text-sm text-gray-400 mt-1">Customize your game audio experience</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 group"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Content with better spacing */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Master Controls Card */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/30 space-y-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-400" />
              Master Controls
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">Sound Effects</span>
                <span className="text-gray-500 text-sm">Toggle all game sounds on/off</span>
              </div>
              <button
                onClick={handleToggleEnabled}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                  isEnabled ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                  isEnabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Volume</span>
                <span className="text-blue-400 font-medium min-w-[3rem] text-right">{Math.round(volume * 100)}%</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={!isEnabled}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed slider-thumb"
                  style={{
                    background: isEnabled 
                      ? `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${volume * 100}%, rgb(51 65 85) ${volume * 100}%, rgb(51 65 85) 100%)`
                      : undefined,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Event Sound Mappings by Category */}
          <div className="space-y-6">
            {Object.entries(eventCategories).map(([category, events]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{category}</h3>
                <div className="grid gap-3">
                  {events.map((eventType) => {
                    const metadata = eventMetadata[eventType];
                    const Icon = metadata.icon;
                    const currentSound = eventSoundMap[eventType];
                    const isPlaying = playingPreview === currentSound;
                    
                    return (
                      <div key={eventType} className="bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-4 transition-all duration-200 border border-slate-700/20">
                        <div className="flex items-center gap-4">
                          {/* Icon and Name */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-slate-700/50 rounded-lg">
                              <Icon className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-white font-medium truncate">{metadata.name}</span>
                          </div>
                          
                          {/* Sound Selection and Preview */}
                          <div className="flex items-center gap-2">
                            <select
                              value={currentSound || 'none'}
                              onChange={(e) => handleSoundChange(eventType, e.target.value === 'none' ? null : e.target.value)}
                              disabled={!isEnabled}
                              className="bg-slate-700/50 text-gray-200 rounded-lg px-4 py-2 text-sm border border-slate-600/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[140px]"
                            >
                              {availableSounds.map((sound) => (
                                <option key={sound.name} value={sound.file || 'none'}>
                                  {sound.name}
                                </option>
                              ))}
                            </select>
                            
                            {currentSound && (
                              <button
                                onClick={() => playPreview(currentSound)}
                                disabled={!isEnabled || isPlaying}
                                className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isPlaying 
                                    ? 'bg-blue-600 text-white animate-pulse' 
                                    : 'bg-slate-700/50 hover:bg-slate-600/50 text-gray-400 hover:text-white'
                                }`}
                                aria-label="Preview sound"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with gradient */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 border-t border-slate-700/50 space-y-3">
          {/* TODO(human): Implement test all sounds functionality */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // TODO(human): Add your implementation here
                console.log('Test all sounds clicked');
              }}
              disabled={!isEnabled}
              className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-xl transition-all duration-200 font-medium border border-slate-600/30"
            >
              Test All Sounds
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-blue-600/20"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}