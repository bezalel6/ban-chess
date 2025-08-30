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

// Default sound file for each event type
const defaultEventSoundMap: Record<EventType, string | null> = {
  'game-invite': '/sounds/game-start.wav',
  'game-start': '/sounds/game-start.wav',
  ban: '/sounds/ban.wav',
  move: '/sounds/move.wav',
  'opponent-move': '/sounds/opponent-move.wav',
  capture: '/sounds/capture.wav',
  castle: '/sounds/castle.wav',
  check: '/sounds/check.wav',
  promote: '/sounds/promote.wav',
  'draw-offer': '/sounds/game-start.wav',
  'time-warning': '/sounds/check.wav',
  'game-end': '/sounds/game-end.wav',
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
    // Preload all available sound files
    availableSounds.forEach(sound => {
      if (sound.file) {
        this.sounds.set(
          sound.file,
          new Howl({
            src: [sound.file],
            volume: this.volume,
            preload: true,
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
        // Regular files use Howl
        this.sounds.set(
          soundFile,
          new Howl({
            src: [soundFile],
            volume: this.volume,
            preload: true,
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
    const presets: Record<string, Partial<Record<EventType, string | null>>> = {
      classic: {
        'game-start': '/sounds/game-start.mp3',
        move: '/sounds/move.mp3',
        capture: '/sounds/capture.mp3',
        castle: '/sounds/castle.mp3',
        check: '/sounds/check.mp3',
        'game-end': '/sounds/game-end.mp3',
      },
      modern: {
        'game-start': '/sounds/digital-start.mp3',
        move: '/sounds/digital-move.mp3',
        capture: '/sounds/digital-capture.mp3',
        check: '/sounds/digital-check.mp3',
        'game-end': '/sounds/digital-end.mp3',
      },
      minimal: {
        move: '/sounds/soft-click.mp3',
        capture: '/sounds/soft-capture.mp3',
        check: '/sounds/soft-alert.mp3',
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
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
