"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Volume1, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import soundManager from "@/lib/sound-manager";

export default function VolumeControl() {
  // Initialize with default values for SSR - will be updated in useEffect
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const soundPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load actual state after mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    setSoundEnabled(soundManager.isEnabled());
    setVolume(soundManager.getVolume());
  }, []);

  // Handle volume change
  const handleVolumeChange = (newVolume: number, playPreview: boolean = true) => {
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
    
    // Play a preview sound when adjusting volume (but not when it's 0)
    // Debounce the sound to avoid playing too many sounds while dragging
    if (playPreview && newVolume > 0) {
      // Clear any existing timeout
      if (soundPreviewTimeoutRef.current) {
        clearTimeout(soundPreviewTimeoutRef.current);
      }
      
      // Set a new timeout to play the sound
      soundPreviewTimeoutRef.current = setTimeout(() => {
        // Use a short, pleasant sound for volume preview
        soundManager.playEvent('move');
      }, 150); // Small delay to debounce rapid changes while dragging
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

  // Don't render dynamic values until mounted to prevent hydration mismatch
  const displayVolume = isMounted ? volume : 0.5;
  const displayEnabled = isMounted ? soundEnabled : true;
  const displayPercentage = Math.round(displayVolume * 100);

  // Get appropriate volume icon - use display values for consistency
  const getVolumeIcon = () => {
    if (!displayEnabled || displayVolume === 0) {
      return VolumeX;
    } else if (displayVolume < 0.5) {
      return Volume1;
    } else {
      return Volume2;
    }
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  // Handle mouse leave - don't auto-close on hover out
  const handleMouseLeave = () => {
    // Removed auto-close on mouse leave - dropdown stays open until clicked outside
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

  // Handle button click - just open dropdown
  const handleButtonClick = () => {
    setIsOpen(!isOpen);
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (soundPreviewTimeoutRef.current) {
        clearTimeout(soundPreviewTimeoutRef.current);
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
      {/* Volume Control Button - using sliders icon to differentiate from mute button */}
      <button
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        className={`p-3 rounded-lg transition-all duration-200 ${
          displayEnabled 
            ? 'text-lichess-orange-500 hover:bg-background-secondary' 
            : 'text-foreground-muted hover:text-foreground hover:bg-background-secondary'
        }`}
        title={`Volume: ${displayPercentage}% (Click to open controls)`}
        aria-label={`Volume control: ${displayPercentage}%`}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* Volume Slider - appears on hover */}
      <div className={`
        absolute top-full right-0 mt-2 p-4 bg-background-secondary border border-border rounded-lg shadow-lg z-50 
        w-64 sm:w-72
        transition-all duration-200 transform-gpu
        ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
      `}>
        <div className="flex items-center gap-3">
          {/* Mute/unmute button with icon */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors hover:bg-background ${
              displayEnabled ? 'text-lichess-orange-500' : 'text-foreground-muted'
            }`}
            title={displayEnabled ? "Mute" : "Unmute"}
          >
            <VolumeIcon className="h-5 w-5" />
          </button>
          
          {/* Volume slider */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={displayEnabled ? displayVolume * 100 : 0}
              onChange={(e) => {
                const newVolume = Number(e.target.value) / 100;
                handleVolumeChange(newVolume);
              }}
              className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer volume-slider"
              style={{
                background: `linear-gradient(to right, rgb(251 127 36) 0%, rgb(251 127 36) ${displayEnabled ? displayVolume * 100 : 0}%, rgb(55 65 81) ${displayEnabled ? displayVolume * 100 : 0}%, rgb(55 65 81) 100%)`,
              }}
            />
          </div>
          
          {/* Volume percentage - larger and more prominent */}
          <span className="text-sm font-bold w-12 text-right text-lichess-orange-500 flex-shrink-0">
            {displayPercentage}%
          </span>
        </div>
        
        {/* Quick volume presets - now with equal spacing */}
        <div className="flex justify-between mt-3 gap-1">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => handleVolumeChange(preset / 100)}
              className={`flex-1 px-1 py-1.5 text-xs rounded transition-colors ${
                displayPercentage === preset && displayEnabled
                  ? 'bg-lichess-orange-500 text-white'
                  : 'bg-background hover:bg-lichess-orange-500/20 text-foreground-muted hover:text-foreground'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
        
        {/* Divider */}
        <div className="my-3 border-t border-border"></div>
        
        {/* Link to full sound settings */}
        <Link 
          href="/sound-settings"
          className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded transition-colors hover:bg-lichess-orange-500/20 text-foreground-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          <span>Advanced Sound Settings</span>
        </Link>
      </div>
    </div>
  );
}