'use client';

import { useState, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Coins,
  Bomb,
  Heart,
  Sword,
  Play,
  Download,
  Shuffle,
  SlidersHorizontal,
  Shield,
  Target,
  Trophy,
  Bell,
  AlertCircle,
  Volume2,
} from 'lucide-react';

// JSFXR parameter structure
interface SoundParams {
  oldParams: boolean;
  wave_type: number;
  p_env_attack: number;
  p_env_sustain: number;
  p_env_punch: number;
  p_env_decay: number;
  p_base_freq: number;
  p_freq_limit: number;
  p_freq_ramp: number;
  p_freq_dramp: number;
  p_vib_strength: number;
  p_vib_speed: number;
  p_arp_mod: number;
  p_arp_speed: number;
  p_duty: number;
  p_duty_ramp: number;
  p_repeat_speed: number;
  p_pha_offset: number;
  p_pha_ramp: number;
  p_lpf_freq: number;
  p_lpf_ramp: number;
  p_lpf_resonance: number;
  p_hpf_freq: number;
  p_hpf_ramp: number;
  sound_vol: number;
  sample_rate: number;
  sample_size: number;
}

// Preset generators - chess-themed and friendly sounds
const presets = {
  // Friendly chess-specific sounds
  move: () => ({
    oldParams: true,
    wave_type: 1, // Sawtooth for smooth movement
    p_env_attack: 0.02,
    p_env_sustain: 0.05,
    p_env_punch: 0.1,
    p_env_decay: 0.08,
    p_base_freq: 0.35,
    p_freq_limit: 0,
    p_freq_ramp: 0.1,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0.5,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 0.9,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0.1,
    p_hpf_ramp: 0,
    sound_vol: 0.4,
    sample_rate: 44100,
    sample_size: 8,
  }),

  capture: () => ({
    oldParams: true,
    wave_type: 0, // Square for decisive capture
    p_env_attack: 0,
    p_env_sustain: 0.08,
    p_env_punch: 0.4,
    p_env_decay: 0.15,
    p_base_freq: 0.25,
    p_freq_limit: 0,
    p_freq_ramp: -0.15,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0.3,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  check: () => ({
    oldParams: true,
    wave_type: 2, // Sine for alert
    p_env_attack: 0.01,
    p_env_sustain: 0.15,
    p_env_punch: 0,
    p_env_decay: 0.2,
    p_base_freq: 0.6,
    p_freq_limit: 0,
    p_freq_ramp: 0,
    p_freq_dramp: 0,
    p_vib_strength: 0.2,
    p_vib_speed: 0.5,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0.3,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.6,
    sample_rate: 44100,
    sample_size: 8,
  }),

  victory: () => ({
    oldParams: true,
    wave_type: 0, // Square for triumph
    p_env_attack: 0,
    p_env_sustain: 0.3,
    p_env_punch: 0,
    p_env_decay: 0.4,
    p_base_freq: 0.4,
    p_freq_limit: 0,
    p_freq_ramp: 0.3,
    p_freq_dramp: 0,
    p_vib_strength: 0.05,
    p_vib_speed: 0.3,
    p_arp_mod: 0.5,
    p_arp_speed: 0.6,
    p_duty: 0.2,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.7,
    sample_rate: 44100,
    sample_size: 8,
  }),

  notification: () => ({
    oldParams: true,
    wave_type: 2, // Sine for pleasant notification
    p_env_attack: 0.01,
    p_env_sustain: 0.1,
    p_env_punch: 0,
    p_env_decay: 0.15,
    p_base_freq: 0.7,
    p_freq_limit: 0,
    p_freq_ramp: 0.1,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0.2,
    p_hpf_ramp: 0,
    sound_vol: 0.4,
    sample_rate: 44100,
    sample_size: 8,
  }),

  click: () => ({
    oldParams: true,
    wave_type: 3, // Noise for UI click
    p_env_attack: 0,
    p_env_sustain: 0.01,
    p_env_punch: 0,
    p_env_decay: 0.02,
    p_base_freq: 0.5,
    p_freq_limit: 0,
    p_freq_ramp: 0,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 0.8,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0.4,
    p_hpf_ramp: 0,
    sound_vol: 0.3,
    sample_rate: 44100,
    sample_size: 8,
  }),

  // Classic game sounds
  coin: () => ({
    oldParams: true,
    wave_type: 0,
    p_env_attack: 0,
    p_env_sustain: 0.05 + Math.random() * 0.1,
    p_env_punch: 0.3 + Math.random() * 0.3,
    p_env_decay: 0.1 + Math.random() * 0.4,
    p_base_freq: 0.4 + Math.random() * 0.5,
    p_freq_limit: 0,
    p_freq_ramp: 0,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  laser: () => ({
    oldParams: true,
    wave_type: Math.floor(Math.random() * 3),
    p_env_attack: 0,
    p_env_sustain: 0.02 + Math.random() * 0.08,
    p_env_punch: 0,
    p_env_decay: 0.1 + Math.random() * 0.2,
    p_base_freq: 0.5 + Math.random() * 0.5,
    p_freq_limit: 0,
    p_freq_ramp: -0.35 - Math.random() * 0.3,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: Math.random(),
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  explosion: () => ({
    oldParams: true,
    wave_type: 3,
    p_env_attack: 0,
    p_env_sustain: 0.1 + Math.random() * 0.3,
    p_env_punch: 0,
    p_env_decay: 0.2 + Math.random() * 0.3,
    p_base_freq: 0.1 + Math.random() * 0.1,
    p_freq_limit: 0,
    p_freq_ramp: -0.2 - Math.random() * 0.2,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  powerup: () => ({
    oldParams: true,
    wave_type: 0,
    p_env_attack: 0,
    p_env_sustain: 0.2 + Math.random() * 0.3,
    p_env_punch: 0,
    p_env_decay: 0.1 + Math.random() * 0.3,
    p_base_freq: 0.2 + Math.random() * 0.3,
    p_freq_limit: 0,
    p_freq_ramp: 0.2 + Math.random() * 0.4,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0.4 + Math.random() * 0.4,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  hit: () => ({
    oldParams: true,
    wave_type: Math.floor(Math.random() * 3),
    p_env_attack: 0,
    p_env_sustain: Math.random() * 0.1,
    p_env_punch: 0.3 + Math.random() * 0.3,
    p_env_decay: 0.1 + Math.random() * 0.2,
    p_base_freq: 0.2 + Math.random() * 0.4,
    p_freq_limit: 0,
    p_freq_ramp: -0.3 - Math.random() * 0.3,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),

  jump: () => ({
    oldParams: true,
    wave_type: 0,
    p_env_attack: 0,
    p_env_sustain: 0.1 + Math.random() * 0.1,
    p_env_punch: 0,
    p_env_decay: 0.1 + Math.random() * 0.2,
    p_base_freq: 0.3 + Math.random() * 0.3,
    p_freq_limit: 0,
    p_freq_ramp: 0.2 + Math.random() * 0.3,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_vib_speed: 0,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: 0,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: 1,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: 0.1,
    p_hpf_ramp: 0,
    sound_vol: 0.5,
    sample_rate: 44100,
    sample_size: 8,
  }),
};

interface SoundMakerProps {
  onSoundCreated?: (audioUrl: string, params: SoundParams) => void;
}

export default function SoundMaker({ onSoundCreated }: SoundMakerProps) {
  const [currentParams, setCurrentParams] = useState<SoundParams>(
    presets.move() // Start with a chess move sound
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  const generateSound = (params: SoundParams) => {
    // Clean up previous audio URL
    if (lastAudioUrl) {
      URL.revokeObjectURL(lastAudioUrl);
    }

    // Create a simple synthesized sound using Web Audio API
    // Type assertion for webkitAudioContext compatibility
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();
    const duration =
      params.p_env_attack + params.p_env_sustain + params.p_env_decay;
    const sampleRate = 44100;
    const buffer = audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const data = buffer.getChannelData(0);

    // Generate waveform based on parameters
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 440 * (1 + params.p_base_freq * 2); // Base frequency

      // Generate wave based on type
      let sample = 0;
      switch (params.wave_type) {
        case 0: // Square
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
          break;
        case 1: // Sawtooth
          sample = 2 * ((freq * t) % 1) - 1;
          break;
        case 2: // Sine
          sample = Math.sin(2 * Math.PI * freq * t);
          break;
        case 3: // Noise
          sample = Math.random() * 2 - 1;
          break;
      }

      // Apply envelope
      let envelope = 1;
      if (t < params.p_env_attack) {
        envelope = t / params.p_env_attack;
      } else if (t < params.p_env_attack + params.p_env_sustain) {
        envelope = 1 - params.p_env_punch * 0.5;
      } else {
        const decayTime = t - params.p_env_attack - params.p_env_sustain;
        envelope =
          (1 - decayTime / params.p_env_decay) * (1 - params.p_env_punch * 0.5);
      }

      data[i] = sample * envelope * params.sound_vol;
    }

    // Convert buffer to WAV blob
    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const soundURL = URL.createObjectURL(blob);
    setLastAudioUrl(soundURL);

    // Play the sound
    if (audioRef.current) {
      audioRef.current.src = soundURL;
      audioRef.current.play();
    } else {
      audioRef.current = new Audio(soundURL);
      audioRef.current.play();
    }

    return soundURL;
  };

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // fmt sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // size
    setUint16(1); // PCM
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg bytes/sec
    setUint16(buffer.numberOfChannels * 2); // block align
    setUint16(16); // 16-bit

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    const volume = 0.8;
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = channels[i][offset] * volume;
        sample = Math.max(-1, Math.min(1, sample));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const handlePreset = (presetName: keyof typeof presets) => {
    const newParams = presets[presetName]();
    setCurrentParams(newParams);
    generateSound(newParams);
  };

  const handleRandomize = () => {
    const presetNames = Object.keys(presets) as (keyof typeof presets)[];
    const randomPreset =
      presetNames[Math.floor(Math.random() * presetNames.length)];
    handlePreset(randomPreset);
  };

  const handleParamChange = (param: keyof SoundParams, value: number) => {
    const newParams = { ...currentParams, [param]: value };
    setCurrentParams(newParams);
  };

  const handlePlayCurrent = () => {
    generateSound(currentParams);
  };

  const handleSave = () => {
    const soundUrl = generateSound(currentParams);
    if (onSoundCreated) {
      onSoundCreated(soundUrl, currentParams);
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <div className='grid grid-cols-3 gap-3'>
          <button
            onClick={() => handlePreset('move')}
            className='flex flex-col items-center p-4 bg-green-900/30 hover:bg-green-800/40 rounded-lg transition-all hover:scale-105 border border-green-700/30'
          >
            <Target className='h-6 w-6 mb-2 text-green-400' />
            <span className='text-sm font-medium'>Piece Move</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Smooth & subtle
            </span>
          </button>
          <button
            onClick={() => handlePreset('capture')}
            className='flex flex-col items-center p-4 bg-red-900/30 hover:bg-red-800/40 rounded-lg transition-all hover:scale-105 border border-red-700/30'
          >
            <Sword className='h-6 w-6 mb-2 text-red-400' />
            <span className='text-sm font-medium'>Capture</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Decisive impact
            </span>
          </button>
          <button
            onClick={() => handlePreset('check')}
            className='flex flex-col items-center p-4 bg-amber-900/30 hover:bg-amber-800/40 rounded-lg transition-all hover:scale-105 border border-amber-700/30'
          >
            <AlertCircle className='h-6 w-6 mb-2 text-amber-400' />
            <span className='text-sm font-medium'>Check Alert</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Attention-grabbing
            </span>
          </button>
          <button
            onClick={() => handlePreset('victory')}
            className='flex flex-col items-center p-4 bg-purple-900/30 hover:bg-purple-800/40 rounded-lg transition-all hover:scale-105 border border-purple-700/30'
          >
            <Trophy className='h-6 w-6 mb-2 text-purple-400' />
            <span className='text-sm font-medium'>Victory</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Triumphant fanfare
            </span>
          </button>
          <button
            onClick={() => handlePreset('notification')}
            className='flex flex-col items-center p-4 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg transition-all hover:scale-105 border border-blue-700/30'
          >
            <Bell className='h-6 w-6 mb-2 text-blue-400' />
            <span className='text-sm font-medium'>Notification</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Pleasant chime
            </span>
          </button>
          <button
            onClick={() => handlePreset('click')}
            className='flex flex-col items-center p-4 bg-gray-800/50 hover:bg-gray-700/60 rounded-lg transition-all hover:scale-105 border border-gray-600/30'
          >
            <Volume2 className='h-6 w-6 mb-2 text-gray-400' />
            <span className='text-sm font-medium'>UI Click</span>
            <span className='text-xs text-foreground-muted mt-1'>
              Soft feedback
            </span>
          </button>
        </div>
      </div>

      {/* Classic Game Sounds */}
      <div>
        <h3 className='text-sm font-semibold mb-3 text-foreground-muted'>
          Classic Game Sounds
        </h3>
        <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
          <button
            onClick={() => handlePreset('coin')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Coins className='h-5 w-5 mb-1' />
            <span className='text-xs'>Coin</span>
          </button>
          <button
            onClick={() => handlePreset('laser')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Zap className='h-5 w-5 mb-1' />
            <span className='text-xs'>Laser</span>
          </button>
          <button
            onClick={() => handlePreset('explosion')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Bomb className='h-5 w-5 mb-1' />
            <span className='text-xs'>Explode</span>
          </button>
          <button
            onClick={() => handlePreset('powerup')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Heart className='h-5 w-5 mb-1' />
            <span className='text-xs'>Power</span>
          </button>
          <button
            onClick={() => handlePreset('hit')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Shield className='h-5 w-5 mb-1' />
            <span className='text-xs'>Hit</span>
          </button>
          <button
            onClick={() => handlePreset('jump')}
            className='flex flex-col items-center p-3 bg-background-tertiary hover:bg-amber-500/20 rounded-lg transition-colors'
          >
            <Sparkles className='h-5 w-5 mb-1' />
            <span className='text-xs'>Jump</span>
          </button>
        </div>
      </div>

      {/* Basic Controls */}
      <div className='space-y-4'>
        <h3 className='text-sm font-semibold text-foreground-muted'>
          Basic Adjustments
        </h3>

        <div>
          <label className='text-xs text-foreground-muted'>Wave Type</label>
          <div className='flex gap-2 mt-1'>
            {['Square', 'Sawtooth', 'Sine', 'Noise'].map((type, i) => (
              <button
                key={type}
                onClick={() => {
                  handleParamChange('wave_type', i);
                  generateSound({ ...currentParams, wave_type: i });
                }}
                className={`px-3 py-1 text-xs rounded ${
                  currentParams.wave_type === i
                    ? 'bg-amber-500 text-white'
                    : 'bg-background-tertiary hover:bg-background'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className='text-xs text-foreground-muted'>Volume</label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={currentParams.sound_vol}
            onChange={e =>
              handleParamChange('sound_vol', parseFloat(e.target.value))
            }
            className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer mt-1'
          />
        </div>

        <div>
          <label className='text-xs text-foreground-muted'>Frequency</label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={currentParams.p_base_freq}
            onChange={e =>
              handleParamChange('p_base_freq', parseFloat(e.target.value))
            }
            className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer mt-1'
          />
        </div>
      </div>

      {/* Advanced Controls Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className='flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors'
      >
        <SlidersHorizontal className='h-4 w-4' />
        {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
      </button>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className='space-y-3 p-4 bg-background-tertiary/50 rounded-lg'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='text-xs text-foreground-muted'>Attack</label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={currentParams.p_env_attack}
                onChange={e =>
                  handleParamChange('p_env_attack', parseFloat(e.target.value))
                }
                className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer'
              />
            </div>
            <div>
              <label className='text-xs text-foreground-muted'>Sustain</label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={currentParams.p_env_sustain}
                onChange={e =>
                  handleParamChange('p_env_sustain', parseFloat(e.target.value))
                }
                className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer'
              />
            </div>
            <div>
              <label className='text-xs text-foreground-muted'>Decay</label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={currentParams.p_env_decay}
                onChange={e =>
                  handleParamChange('p_env_decay', parseFloat(e.target.value))
                }
                className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer'
              />
            </div>
            <div>
              <label className='text-xs text-foreground-muted'>Punch</label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={currentParams.p_env_punch}
                onChange={e =>
                  handleParamChange('p_env_punch', parseFloat(e.target.value))
                }
                className='w-full h-1 bg-background-tertiary rounded-lg appearance-none cursor-pointer'
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex gap-3'>
        <button
          onClick={handlePlayCurrent}
          className='flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors'
        >
          <Play className='h-4 w-4' />
          Play
        </button>
        <button
          onClick={handleRandomize}
          className='flex items-center gap-2 px-4 py-2 bg-background-tertiary hover:bg-background rounded-lg transition-colors'
        >
          <Shuffle className='h-4 w-4' />
          Random
        </button>
        {onSoundCreated && (
          <button
            onClick={handleSave}
            className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
          >
            <Download className='h-4 w-4' />
            Use This Sound
          </button>
        )}
      </div>
    </div>
  );
}
