import { Howl } from 'howler';
import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  Flag,
  Handshake,
  Shield,
  Swords,
  Trophy,
  Users,
  UserPlus,
} from 'lucide-react';
import {
  ChessBan,
  ChessCastle,
  ChessKnight,
  ChessPromotion,
} from '@/components/icons/ChessIcons';

// Define all possible event types in the game
export const eventTypes = [
  'game-invite',
  'game-start',
  'ban',
  'move',
  'opponent-move',
  'capture',
  'castle',
  'check',
  'promote',
  'draw-offer',
  'time-warning',
  'game-end',
] as const;

export type EventType = (typeof eventTypes)[number];

// Event metadata including display names and icons
export const eventMetadata: Record<
  EventType,
  { name: string; icon: LucideIcon }
> = {
  'game-invite': { name: 'Game Invite', icon: UserPlus },
  'game-start': { name: 'Game Start', icon: Flag },
  ban: { name: 'Ban', icon: ChessBan as unknown as LucideIcon },
  move: { name: 'Move', icon: ChessKnight as unknown as LucideIcon },
  'opponent-move': { name: 'Opponent Move', icon: Users },
  capture: { name: 'Capture', icon: Swords },
  castle: { name: 'Castle', icon: ChessCastle as unknown as LucideIcon },
  check: { name: 'Check', icon: Shield },
  promote: { name: 'Promote', icon: ChessPromotion as unknown as LucideIcon },
  'draw-offer': { name: 'Draw Offer', icon: Handshake },
  'time-warning': { name: 'Time Warning', icon: Clock },
  'game-end': { name: 'Game End', icon: Trophy },
};

// Available sound files that can be mapped to events
export const availableSounds = [
  { file: '/sounds/move.wav', name: 'Move' },
  { file: '/sounds/capture.wav', name: 'Capture' },
  { file: '/sounds/castle.wav', name: 'Castle' },
  { file: '/sounds/check.wav', name: 'Check' },
  { file: '/sounds/promote.wav', name: 'Promote' },
  { file: '/sounds/opponent-move.wav', name: 'Opponent Move' },
  { file: '/sounds/game-start.wav', name: 'Game Start' },
  { file: '/sounds/game-end.wav', name: 'Game End' },
  { file: '/sounds/ban.wav', name: 'Ban' },
  { file: null, name: 'No Sound' },
] as const;

// Default sound file for each event type - using chess.com URLs
const defaultEventSoundMap: Record<EventType, string | null> = {
  'game-invite':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3',
  'game-start':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3',
  ban: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/boom.mp3',
  move: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3',
  'opponent-move':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3',
  capture:
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3',
  castle:
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3',
  check:
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3',
  promote:
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3',
  'draw-offer':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/draw-offer.mp3',
  'time-warning':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3',
  'game-end':
    'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
};

class SoundManager {
  private sounds: Map<string, Howl>;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private eventSoundMap: Record<EventType, string | null>;

  constructor() {
    this.sounds = new Map();
    this.eventSoundMap = { ...defaultEventSoundMap };
    this.initializeSounds();
    this.loadPreferences();
  }

  private initializeSounds() {
    // Preload default chess.com sounds
    Object.values(defaultEventSoundMap).forEach(soundUrl => {
      if (soundUrl) {
        this.sounds.set(
          soundUrl,
          new Howl({
            src: [soundUrl],
            volume: this.volume,
            preload: true,
            html5: true, // Use HTML5 audio for cross-origin requests
          })
        );
      }
    });
  }

  private loadPreferences() {
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('soundEnabled');
      const savedVolume = localStorage.getItem('soundVolume');
      const savedEventMap = localStorage.getItem('soundEventMap');

      if (savedEnabled !== null) {
        // this.enabled = savedEnabled === "true";

        this.enabled = true;
        savedEnabled === 'true';
      }

      if (savedVolume !== null) {
        this.setVolume(parseFloat(savedVolume));
      }

      if (savedEventMap !== null) {
        try {
          const map = JSON.parse(savedEventMap);
          // Merge saved preferences with defaults
          this.eventSoundMap = { ...defaultEventSoundMap, ...map };
        } catch (e) {
          console.error('Failed to parse sound event map:', e);
        }
      }
    }
  }

  private savePreferences() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(this.enabled));
      localStorage.setItem('soundVolume', String(this.volume));
      localStorage.setItem('soundEventMap', JSON.stringify(this.eventSoundMap));
    }
  }

  // Play sound for a specific event type
  playEvent(eventType: EventType) {
    if (!this.enabled) return;

    const soundFile = this.eventSoundMap[eventType];
    if (!soundFile) return; // No sound mapped for this event

    const sound = this.sounds.get(soundFile);
    if (sound) {
      sound.stop(); // Stop any currently playing instance
      sound.play();
    }
  }

  // Set which sound file to use for a specific event
  setEventSound(eventType: EventType, soundFile: string | null) {
    this.eventSoundMap[eventType] = soundFile;

    // If it's a new sound file we haven't loaded yet, load it
    if (soundFile && !this.sounds.has(soundFile)) {
      // For blob URLs and data URLs, use native Audio instead of Howl
      if (soundFile.startsWith('blob:') || soundFile.startsWith('data:')) {
        // Create a simple wrapper that mimics Howl's interface
        const audio = new Audio(soundFile);
        audio.volume = this.volume;

        const howlLike = {
          play: () => {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          },
          stop: () => {
            audio.pause();
            audio.currentTime = 0;
          },
          volume: (v?: number) => {
            if (v !== undefined) audio.volume = v;
            return audio.volume;
          },
          state: () => 'loaded' as const,
          load: () => {},
        };

        this.sounds.set(soundFile, howlLike as unknown as Howl);
      } else {
        // Regular files and chess.com URLs use Howl
        const isChessComUrl = soundFile.includes('chesscomfiles.com');
        this.sounds.set(
          soundFile,
          new Howl({
            src: [soundFile],
            volume: this.volume,
            preload: true,
            html5: isChessComUrl, // Use HTML5 for chess.com URLs
          })
        );
      }
    }

    this.savePreferences();
  }

  // Get the current sound mapping for an event
  getEventSound(eventType: EventType): string | null {
    return this.eventSoundMap[eventType];
  }

  // Get all event sound mappings
  getEventSoundMap(): Record<EventType, string | null> {
    return { ...this.eventSoundMap };
  }

  playMoveSound(moveDetails: {
    capture?: boolean;
    castle?: boolean;
    check?: boolean;
    promotion?: boolean;
    isOpponent?: boolean;
  }) {
    if (!this.enabled) return;

    // Priority order for sounds - play the most specific event
    if (moveDetails.check) {
      this.playEvent('check');
    } else if (moveDetails.castle) {
      this.playEvent('castle');
    } else if (moveDetails.promotion) {
      this.playEvent('promote');
    } else if (moveDetails.capture) {
      this.playEvent('capture');
    } else if (moveDetails.isOpponent) {
      this.playEvent('opponent-move');
    } else {
      this.playEvent('move');
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.savePreferences();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));

    this.sounds.forEach(sound => {
      sound.volume(this.volume);
    });

    this.savePreferences();
  }

  getVolume(): number {
    return this.volume;
  }

  // Set global volume (0-1 scale)
  setGlobalVolume(volume: number) {
    this.setVolume(volume);
  }

  toggleMute() {
    this.setEnabled(!this.enabled);
  }

  // Load a preset sound configuration
  loadPreset(preset: 'classic' | 'modern' | 'minimal') {
    const baseUrl =
      'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/';
    const presets: Record<string, Partial<Record<EventType, string | null>>> = {
      classic: {
        'game-start': `${baseUrl}default/game-start.mp3`,
        move: `${baseUrl}default/move-self.mp3`,
        capture: `${baseUrl}default/capture.mp3`,
        castle: `${baseUrl}default/castle.mp3`,
        check: `${baseUrl}default/move-check.mp3`,
        'game-end': `${baseUrl}default/game-end.mp3`,
      },
      modern: {
        'game-start': `${baseUrl}futuristic/game-start.mp3`,
        move: `${baseUrl}futuristic/move-self.mp3`,
        capture: `${baseUrl}futuristic/capture.mp3`,
        check: `${baseUrl}futuristic/move-check.mp3`,
        'game-end': `${baseUrl}futuristic/game-end.mp3`,
      },
      minimal: {
        move: `${baseUrl}sfx/move-self.mp3`,
        capture: `${baseUrl}sfx/capture.mp3`,
        check: `${baseUrl}sfx/move-check.mp3`,
      },
    };

    const selectedPreset = presets[preset];
    if (selectedPreset) {
      // Reset all sounds first
      eventTypes.forEach(eventType => {
        this.eventSoundMap[eventType] = null;
      });

      // Apply preset
      Object.entries(selectedPreset).forEach(([event, sound]) => {
        this.setEventSound(event as EventType, sound);
      });
    }
  }

  preloadAll() {
    this.sounds.forEach(sound => {
      if (sound.state() === 'unloaded') {
        sound.load();
      }
    });
  }

  resetToDefaults() {
    // Reset to standard theme
    this.applyTheme('standard');
    localStorage.removeItem('selectedSoundTheme');
    localStorage.removeItem('yoinkedSounds');
  }

  applyTheme(theme: string) {
    // Map themes to chess.com sound themes
    const chessComThemeMap: Record<string, string> = {
      standard: 'default',
      futuristic: 'futuristic',
      piano: 'piano',
      robot: 'robot',
      sfx: 'sfx',
      nes: 'nes',
      lisp: 'lisp',
      woodland: 'woodland',
      instrument: 'instrument',
      pirate: 'default', // Use default for pirate theme (or any custom theme)
    };

    const chessComTheme = chessComThemeMap[theme] || 'default';
    const baseUrl = `https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/${chessComTheme}/`;

    // Map our events to chess.com sound files
    const eventToFile: Record<string, string> = {
      'game-invite': 'notify',
      'game-start': 'game-start',
      ban: 'boom', // Use boom sound for ban
      move: 'move-self',
      'opponent-move': 'move-opponent',
      capture: 'capture',
      castle: 'castle',
      check: 'move-check',
      promote: 'promote',
      'draw-offer': 'draw-offer',
      'time-warning': 'tenseconds',
      'game-end': 'game-end',
    };

    for (const [event, file] of Object.entries(eventToFile)) {
      const soundUrl = `${baseUrl}${file}.mp3`;
      this.eventSoundMap[event as EventType] = soundUrl;

      // Preload the sound from chess.com
      if (!this.sounds.has(soundUrl)) {
        this.sounds.set(
          soundUrl,
          new Howl({
            src: [soundUrl],
            volume: this.volume,
            preload: true,
            html5: true, // Use HTML5 audio for cross-origin requests
          })
        );
      }
    }

    this.savePreferences();
  }

  private saveToLocalStorage() {
    this.savePreferences();
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
