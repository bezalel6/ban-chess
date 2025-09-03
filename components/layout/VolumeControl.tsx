"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import soundManager from "@/lib/sound-manager";

export default function VolumeControl() {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial state
  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled());
    setVolume(soundManager.getVolume());
  }, []);

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
    
    // If volume > 0, ensure sound is enabled
    if (newVolume > 0 && !soundEnabled) {
      setSoundEnabled(true);
      soundManager.setEnabled(true);
    }
    // If volume is 0, disable sound
    else if (newVolume === 0) {
      setSoundEnabled(false);
      soundManager.setEnabled(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
    
    // If enabling and volume is 0, set to 50%
    if (newEnabled && volume === 0) {
      setVolume(0.5);
      soundManager.setVolume(0.5);
    }
  };

  // Get appropriate volume icon
  const getVolumeIcon = () => {
    if (!soundEnabled || volume === 0) {
      return VolumeX;
    } else if (volume < 0.5) {
      return Volume1;
    } else {
      return Volume2;
    }
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsHovering(false);
    timeoutRef.current = setTimeout(() => {
      if (!isHovering) {
        setIsOpen(false);
      }
    }, 300);
  };

  // Handle keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Handle button click (for mobile and keyboard users)
  const handleButtonClick = () => {
    // On mobile, toggle the dropdown, on desktop just mute/unmute
    if (window.innerWidth < 768) {
      setIsOpen(!isOpen);
    } else {
      toggleMute();
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlRef.current && !controlRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const VolumeIcon = getVolumeIcon();

  return (
    <div 
      ref={controlRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Volume Icon Button */}
      <button
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        className={`p-3 rounded-lg transition-all duration-200 ${
          soundEnabled 
            ? 'text-lichess-orange-500 hover:bg-background-secondary' 
            : 'text-foreground-muted hover:text-foreground hover:bg-background-secondary'
        }`}
        title={`Volume: ${soundEnabled ? Math.round(volume * 100) : 0}% (Click to ${soundEnabled ? 'mute' : 'unmute'})`}
        aria-label={`Volume control: ${soundEnabled ? Math.round(volume * 100) : 0}%`}
      >
        <VolumeIcon className="h-4 w-4" />
      </button>

      {/* Volume Slider - appears on hover */}
      <div className={`
        absolute top-full right-0 mt-2 p-4 bg-background-secondary border border-border rounded-lg shadow-lg z-50 
        w-48 sm:min-w-[200px]
        transition-all duration-200 transform-gpu
        ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
      `}>
        <div className="flex items-center gap-3">
          {/* Small volume icon */}
          <VolumeIcon className={`h-4 w-4 flex-shrink-0 ${
            soundEnabled ? 'text-lichess-orange-500' : 'text-foreground-muted'
          }`} />
          
          {/* Volume slider */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={soundEnabled ? volume * 100 : 0}
              onChange={(e) => {
                const newVolume = Number(e.target.value) / 100;
                handleVolumeChange(newVolume);
              }}
              className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer volume-slider"
              style={{
                background: `linear-gradient(to right, rgb(251 127 36) 0%, rgb(251 127 36) ${soundEnabled ? volume * 100 : 0}%, rgb(55 65 81) ${soundEnabled ? volume * 100 : 0}%, rgb(55 65 81) 100%)`,
              }}
            />
          </div>
          
          {/* Volume percentage */}
          <span className="text-xs font-mono w-8 text-right text-lichess-orange-500 font-medium flex-shrink-0">
            {soundEnabled ? Math.round(volume * 100) : 0}%
          </span>
        </div>
        
        {/* Quick volume presets */}
        <div className="flex justify-between mt-3 gap-1">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => handleVolumeChange(preset / 100)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                Math.round(volume * 100) === preset && soundEnabled
                  ? 'bg-lichess-orange-500 text-white'
                  : 'bg-background hover:bg-lichess-orange-500/20 text-foreground-muted hover:text-foreground'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}