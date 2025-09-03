"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Headphones, X, HelpCircle } from "lucide-react";

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
        absolute top-full right-0 mt-2 p-4 bg-background-secondary border border-border rounded-lg shadow-lg z-50 
        w-80 sm:w-96
        transition-all duration-200 transform-gpu
        ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Headphones className="h-4 w-4 text-lichess-orange-500" />
            Headset Mode
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-background rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-foreground-muted" />
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-background/50 border border-border/50 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-lichess-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground-muted leading-relaxed">
              Keeps wireless headphones active while playing by emitting an inaudible signal. 
              This prevents them from going to sleep during quiet moments, ensuring game sounds 
              play immediately when they occur.
            </p>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-4 p-3 bg-background rounded-lg">
          <span className="text-sm font-medium">
            Status: <span className={enabled ? "text-green-500" : "text-foreground-muted"}>
              {enabled ? "Active" : "Inactive"}
            </span>
          </span>
          <button
            onClick={enabled ? handleDisable : handleEnable}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${
              enabled
                ? "bg-red-500 hover:bg-red-600"
                : "bg-lichess-orange-500 hover:bg-lichess-orange-600"
            }`}
          >
            {enabled ? "Disable" : "Enable"}
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          {/* Playback Mode */}
          <div className="flex items-center justify-between">
            <label htmlFor="headset-mode" className="text-sm font-medium">
              Signal Type
            </label>
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
              className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-lichess-orange-500/50"
            >
              <option value="tone">High-Frequency Tone (19kHz)</option>
              <option value="noise">White Noise (Ultra-quiet)</option>
              <option value="wav">Near-Silence WAV Loop</option>
            </select>
          </div>

          {/* Tab Aware Option */}
          <div className="flex items-center justify-between">
            <label htmlFor="tab-aware" className="text-sm font-medium">
              Pause when tab inactive
            </label>
            <input
              id="tab-aware"
              type="checkbox"
              checked={tabAware}
              onChange={(e) => setTabAware(e.target.checked)}
              className="w-4 h-4 text-lichess-orange-500 bg-background border-border rounded focus:ring-lichess-orange-500/50"
            />
          </div>
        </div>

        {/* Mode descriptions */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] text-foreground-muted">
            {mode === "tone" && "Emits a 19kHz tone - inaudible to most adults"}
            {mode === "noise" && "Plays extremely quiet white noise"}
            {mode === "wav" && "Loops a near-silent WAV file for compatibility"}
          </p>
        </div>
      </div>
    </div>
  );
}