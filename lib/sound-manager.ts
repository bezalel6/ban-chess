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

// Available sound files that can be mapped to events (using lichess sounds)
export const availableSounds = [
  { file: '/sounds/standard/Move.mp3', name: 'Move' },
  { file: '/sounds/standard/Capture.mp3', name: 'Capture' },
  { file: '/sounds/standard/Check.mp3', name: 'Check' },
  { file: '/sounds/standard/Checkmate.mp3', name: 'Checkmate' },
  { file: '/sounds/standard/Victory.mp3', name: 'Victory' },
  { file: '/sounds/standard/Defeat.mp3', name: 'Defeat' },
  { file: '/sounds/standard/Draw.mp3', name: 'Draw' },
  { file: '/sounds/standard/GenericNotify.mp3', name: 'Notify' },
  { file: '/sounds/standard/Explosion.mp3', name: 'Explosion' },
  { file: '/sounds/standard/LowTime.mp3', name: 'Low Time' },
  { file: null, name: 'No Sound' },
] as const;

// Default sound file for each event type - using local lichess sounds
const defaultEventSoundMap: Record<EventType, string | null> = {
  'game-invite': '/sounds/standard/NewChallenge.mp3',
  'game-start': '/sounds/standard/GenericNotify.mp3',
  ban: '/sounds/standard/Explosion.mp3',
  move: '/sounds/standard/Move.mp3',
  'opponent-move': '/sounds/standard/Move.mp3',
  capture: '/sounds/standard/Capture.mp3',
  castle: '/sounds/standard/Move.mp3',
  check: '/sounds/standard/Check.mp3',
  promote: '/sounds/standard/GenericNotify.mp3',
  'draw-offer': '/sounds/standard/GenericNotify.mp3',
  'time-warning': '/sounds/standard/LowTime.mp3',
  'game-end': '/sounds/standard/Victory.mp3',
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
    // Preload default lichess sounds
    Object.values(defaultEventSoundMap).forEach(soundUrl => {
      if (soundUrl) {
        this.sounds.set(
          soundUrl,
          new Howl({
            src: [soundUrl],
            volume: this.volume,
            preload: true,
            html5: false, // Use Web Audio API for local files
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
        // Regular local files use Howl with Web Audio API
        this.sounds.set(
          soundFile,
          new Howl({
            src: [soundFile],
            volume: this.volume,
            preload: true,
            html5: false, // Use Web Audio API for local files
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

  // Load a preset sound configuration (using local lichess sounds)
  loadPreset(preset: 'classic' | 'modern' | 'minimal') {
    const presets: Record<string, Partial<Record<EventType, string | null>>> = {
      classic: {
        'game-start': '/sounds/standard/GenericNotify.mp3',
        move: '/sounds/standard/Move.mp3',
        capture: '/sounds/standard/Capture.mp3',
        castle: '/sounds/standard/Move.mp3',
        check: '/sounds/standard/Check.mp3',
        'game-end': '/sounds/standard/Victory.mp3',
      },
      modern: {
        'game-start': '/sounds/futuristic/GenericNotify.mp3',
        move: '/sounds/futuristic/Move.mp3',
        capture: '/sounds/futuristic/Capture.mp3',
        check: '/sounds/futuristic/Check.mp3',
        'game-end': '/sounds/futuristic/Victory.mp3',
      },
      minimal: {
        move: '/sounds/sfx/Move.mp3',
        capture: '/sounds/sfx/Capture.mp3',
        check: '/sounds/sfx/Check.mp3',
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
    // Import the getSoundPath function to get proper paths
    import('@/lib/sound-themes').then(
      ({ getSoundPath, eventToSoundFile, soundThemes }) => {
        // Validate theme
        const validTheme = soundThemes.includes(
          theme as (typeof soundThemes)[number]
        )
          ? (theme as (typeof soundThemes)[number])
          : 'standard';

        // Map our events to lichess sound files
        for (const [event] of Object.entries(eventToSoundFile)) {
          const soundUrl = getSoundPath(validTheme, event, 'mp3');
          if (soundUrl) {
            this.eventSoundMap[event as EventType] = soundUrl;

            // Preload the sound
            if (!this.sounds.has(soundUrl)) {
              this.sounds.set(
                soundUrl,
                new Howl({
                  src: [soundUrl],
                  volume: this.volume,
                  preload: true,
                  html5: false, // Use Web Audio API for local files
                })
              );
            }
          }
        }

        this.savePreferences();
      }
    );
  }

  private saveToLocalStorage() {
    this.savePreferences();
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
