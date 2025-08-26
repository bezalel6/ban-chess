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
    <div className="sound-control">
      <button
        onClick={handleToggle}
        className="sound-toggle"
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
          className="volume-slider"
          style={{
            background: `linear-gradient(to right, #4caf50 0%, #4caf50 ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
          }}
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      )}

      <style jsx>{`
        .sound-control {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(30, 30, 45, 0.95);
          padding: 8px 12px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1000;
        }

        .sound-toggle {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .sound-toggle:hover {
          transform: scale(1.1);
        }

        .volume-slider {
          width: 80px;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #4caf50;
          border-radius: 50%;
          cursor: pointer;
        }

        .volume-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #4caf50;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        @media (max-width: 768px) {
          .sound-control {
            top: 10px;
            right: 10px;
            padding: 6px 10px;
          }

          .sound-toggle {
            font-size: 20px;
          }

          .volume-slider {
            width: 60px;
          }
        }
      `}</style>
    </div>
  );
}
