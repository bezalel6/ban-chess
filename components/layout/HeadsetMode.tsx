"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Headphones } from "lucide-react";

type Mode = "tone" | "noise" | "wav";

export default function HeadsetMode() {
  // hooks always called in same order
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("tone");
  const [tabAware, setTabAware] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // client-only initialization
  useEffect(() => {
    const savedMode = localStorage.getItem("headsetModeMode") as Mode;
    const savedTabAware = localStorage.getItem("headsetModeTabAware");
    const savedEnabled = localStorage.getItem("headsetModeEnabled");
    if (savedMode) setMode(savedMode);
    if (savedTabAware !== null) setTabAware(savedTabAware === "true");
    if (savedEnabled === "true") {
      // Don't auto-enable on mount, just track the state
      setEnabled(true);
    }
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // playback helpers
  const startPlayback = useCallback(async () => {
    if (mode === "wav") {
      const el = new Audio(
        "data:audio/wav;base64," +
          "UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAB9AAACABAAZGF0YQgAAAAAAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A"
      );
      el.loop = true;
      await el.play();
      audioElRef.current = el;
      return;
    }

    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    if (mode === "tone") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 19000;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      sourceRef.current = osc;
    }

    if (mode === "noise") {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.01;
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      sourceRef.current = noise;
    }
  }, [mode]);

  const stopPlayback = useCallback(() => {
    if (mode === "wav") {
      audioElRef.current?.pause();
      audioElRef.current = null;
    } else {
      if (sourceRef.current && 'stop' in sourceRef.current) {
        (sourceRef.current as AudioScheduledSourceNode).stop();
      }
      sourceRef.current?.disconnect?.();
      sourceRef.current = null;
    }
  }, [mode]);

  const handleEnable = async () => {
    await startPlayback();
    setEnabled(true);
    localStorage.setItem("headsetModeEnabled", "true");
  };

  const handleDisable = () => {
    stopPlayback();
    setEnabled(false);
    localStorage.setItem("headsetModeEnabled", "false");
  };

  // tab-aware playback effect
  useEffect(() => {
    if (!enabled || !tabAware) return;
    const handleVisibility = async () => {
      if (document.visibilityState === "hidden") stopPlayback();
      else await startPlayback();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, tabAware, mode, startPlayback, stopPlayback]);

  // persist settings
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("headsetModeMode", mode);
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("headsetModeTabAware", tabAware ? "true" : "false");
  }, [tabAware, mounted]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // render only when mounted
  if (!mounted) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-lg transition-all duration-200 ${
          enabled 
            ? 'text-lichess-orange-500 hover:bg-background-secondary' 
            : 'text-foreground-muted hover:text-foreground hover:bg-background-secondary'
        }`}
        title={enabled ? "Headset Mode: Active" : "Headset Mode: Configure"}
        aria-label="Headset mode settings"
      >
        <Headphones className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      <div className={`
        absolute top-full right-0 mt-2 p-3 bg-background-secondary border border-border rounded-lg shadow-lg z-50 
        w-72
        transition-all duration-200 transform-gpu
        ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Headset Mode</h3>
          <button
            onClick={enabled ? handleDisable : handleEnable}
            className={`px-3 py-1 rounded text-xs font-medium text-white transition-colors ${
              enabled ? "bg-red-500 hover:bg-red-600" : "bg-lichess-orange-500 hover:bg-lichess-orange-600"
            }`}
          >
            {enabled ? "Disable" : "Enable"}
          </button>
        </div>

        {/* Quick explanation */}
        <p className="text-[10px] text-foreground-muted mb-3">
          Keeps wireless headphones awake during quiet moments
        </p>

        {/* Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="headset-mode" className="text-xs">Signal</label>
            <select
              id="headset-mode"
              value={mode}
              onChange={(e) => {
                const newMode = e.target.value as Mode;
                if (enabled) {
                  stopPlayback();
                  setMode(newMode);
                  startPlayback();
                } else {
                  setMode(newMode);
                }
              }}
              className="px-2 py-1 text-xs bg-background border border-border rounded"
            >
              <option value="tone">19kHz Tone</option>
              <option value="noise">White Noise</option>
              <option value="wav">WAV Loop</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="tab-aware" className="text-xs">Pause when tab inactive</label>
            <input
              id="tab-aware"
              type="checkbox"
              checked={tabAware}
              onChange={(e) => setTabAware(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        </div>

        {/* Battery Warning */}
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
          <p className="text-[10px] text-yellow-400">
            ⚠️ This will drain your headphones&apos; battery faster than normal. Obviously.
          </p>
        </div>
      </div>
    </div>
  );
}