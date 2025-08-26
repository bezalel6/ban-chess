'use client';

import React, { useState, useEffect } from 'react';
import soundManager from '@/lib/sound-manager';

export default function SoundControl() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="fixed bottom-4 left-4 z-40">
      <div 
        className={`bg-slate-800 rounded-xl border border-slate-700/50 shadow-xl transition-all ${
          isExpanded ? 'p-3' : 'p-2'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group"
            title={isEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {isEnabled ? (
              <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {isEnabled && isExpanded && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 appearance-none bg-slate-700 rounded-full outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, #334155 ${volume * 100}%, #334155 100%)`,
                }}
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="text-xs text-gray-500 font-medium min-w-[3ch]">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}