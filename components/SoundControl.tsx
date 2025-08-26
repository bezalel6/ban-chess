'use client';

import React, { useState, useEffect } from 'react';
import soundManager from '@/lib/sound-manager';

export default function SoundControl() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    // Initialize with saved preferences
    setIsEnabled(soundManager.isEnabled());
    setVolume(soundManager.getVolume());
  }, []);

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  return (
    <div className="fixed top-5 right-5 flex items-center gap-2.5 bg-dark-600/95 px-3 py-2 rounded-lg shadow-2xl border border-white/10 z-40 md:top-5 md:right-5 max-md:top-2.5 max-md:right-2.5 max-md:px-2.5 max-md:py-1.5">
      <button
        onClick={handleToggle}
        className="bg-transparent border-none text-2xl cursor-pointer p-1 flex items-center justify-center transition-transform hover:scale-110 max-md:text-xl"
        title={isEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {isEnabled ? '🔊' : '🔇'}
      </button>

      {isEnabled && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 appearance-none bg-white/20 rounded-sm outline-none max-md:w-15"
          style={{
            background: `linear-gradient(to right, #4caf50 0%, #4caf50 ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
          }}
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      )}
    </div>
  );
}
