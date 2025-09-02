import { Howl } from "howler";
import type { LucideIcon } from "lucide-react";
import {
  Mail,
  Play,
  Ban,
  Move,
  Users,
  Swords,
  Castle,
  AlertTriangle,
  Crown,
  Handshake,
  Clock,
  Trophy,
} from "lucide-react";

// Define all possible event types in the game
export const eventTypes = [
  "game-invite",
  "game-start",
  "ban",
  "move",
  "opponent-move",
  "capture",
  "castle",
  "check",
  "promote",
  "draw-offer",
  "time-warning",
  "game-end",
] as const;

export type EventType = (typeof eventTypes)[number];

// Event metadata including display names and icons
export const eventMetadata: Record<EventType, { name: string; icon: LucideIcon }> = {
  "game-invite": { name: "Game Invite", icon: Mail },
  "game-start": { name: "Game Start", icon: Play },
  "ban": { name: "Ban", icon: Ban },
  "move": { name: "Move", icon: Move },
  "opponent-move": { name: "Opponent Move", icon: Users },
  "capture": { name: "Capture", icon: Swords },
  "castle": { name: "Castle", icon: Castle },
  "check": { name: "Check", icon: AlertTriangle },
  "promote": { name: "Promote", icon: Crown },
  "draw-offer": { name: "Draw Offer", icon: Handshake },
  "time-warning": { name: "Time Warning", icon: Clock },
  "game-end": { name: "Game End", icon: Trophy },
};

// Available sound themes and files from Lichess
const soundThemes = {
  standard: "/sounds/standard",
  lisp: "/sounds/lisp",
  piano: "/sounds/piano",
  futuristic: "/sounds/futuristic",
  nes: "/sounds/nes",
  robot: "/sounds/robot",
  sfx: "/sounds/sfx",
  woodland: "/sounds/woodland",
} as const;

// Available sound files that can be mapped to events (using standard theme as primary)
export const availableSounds = [
  { file: "/sounds/standard/Move.mp3", name: "Move" },
  { file: "/sounds/standard/Capture.mp3", name: "Capture" },
  { file: "/sounds/lisp/Castles.mp3", name: "Castle" },
  { file: "/sounds/standard/Check.mp3", name: "Check" },
  { file: "/sounds/standard/Checkmate.mp3", name: "Checkmate" },
  { file: "/sounds/standard/Victory.mp3", name: "Victory" },
  { file: "/sounds/standard/Defeat.mp3", name: "Defeat" },
  { file: "/sounds/standard/Draw.mp3", name: "Draw" },
  { file: "/sounds/standard/NewChallenge.mp3", name: "New Challenge" },
  { file: "/sounds/standard/Confirmation.mp3", name: "Confirmation" },
  { file: "/sounds/standard/GenericNotify.mp3", name: "Generic Notify" },
  { file: "/sounds/standard/LowTime.mp3", name: "Low Time" },
  { file: "/sounds/standard/Explosion.mp3", name: "Explosion" },
  { file: "/sounds/standard/Error.mp3", name: "Error" },
  { file: null, name: "No Sound" },
] as const;

// Default sound file for each event type using Lichess standard theme
const defaultEventSoundMap: Record<EventType, string | null> = {
  "game-invite": "/sounds/standard/NewChallenge.mp3",
  "game-start": "/sounds/standard/Confirmation.mp3",
  "ban": "/sounds/standard/Explosion.mp3", // More appropriate than placeholder
  "move": "/sounds/standard/Move.mp3",
  "opponent-move": "/sounds/standard/Move.mp3", // Same as move for consistency
  "capture": "/sounds/standard/Capture.mp3",
  "castle": "/sounds/lisp/Castles.mp3", // Using lisp theme as standard lacks castle sound
  "check": "/sounds/standard/Check.mp3",
  "promote": "/sounds/standard/Checkmate.mp3", // Promotion is significant like checkmate
  "draw-offer": "/sounds/standard/GenericNotify.mp3",
  "time-warning": "/sounds/standard/LowTime.mp3",
  "game-end": "/sounds/standard/Victory.mp3", // Default to victory, can be changed based on result
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
    availableSounds.forEach((sound) => {
      if (sound.file) {
        this.sounds.set(
          sound.file,
          new Howl({
            src: [sound.file],
            volume: this.volume,
            preload: true,
          }),
        );
      }
    });
  }

  private loadPreferences() {
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("soundEnabled");
      const savedVolume = localStorage.getItem("soundVolume");
      const savedEventMap = localStorage.getItem("soundEventMap");

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === "true";
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
          console.error("Failed to parse sound event map:", e);
        }
      }
    }
  }

  private savePreferences() {
    if (typeof window !== "undefined") {
      localStorage.setItem("soundEnabled", String(this.enabled));
      localStorage.setItem("soundVolume", String(this.volume));
      localStorage.setItem("soundEventMap", JSON.stringify(this.eventSoundMap));
    }
  }

  // Play sound for a specific event type
  playEvent(eventType: EventType, context?: { result?: string; playerRole?: "white" | "black" | null }) {
    if (!this.enabled) return;

    // Special handling for game-end sounds
    if (eventType === "game-end" && context?.result) {
      this.playGameEndSoundSmart(context.result, context.playerRole || null);
      return;
    }

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
      this.sounds.set(
        soundFile,
        new Howl({
          src: [soundFile],
          volume: this.volume,
          preload: true,
        }),
      );
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
      this.playEvent("check");
    } else if (moveDetails.castle) {
      this.playEvent("castle");
    } else if (moveDetails.promotion) {
      this.playEvent("promote");
    } else if (moveDetails.capture) {
      this.playEvent("capture");
    } else if (moveDetails.isOpponent) {
      this.playEvent("opponent-move");
    } else {
      this.playEvent("move");
    }
  }

  // Play game end sound based on result
  playGameEndSound(result: "victory" | "defeat" | "draw") {
    if (!this.enabled) return;

    const soundFile = {
      victory: "/sounds/standard/Victory.mp3",
      defeat: "/sounds/standard/Defeat.mp3",
      draw: "/sounds/standard/Draw.mp3",
    }[result];

    if (soundFile) {
      const sound = this.sounds.get(soundFile);
      if (sound) {
        sound.stop();
        sound.play();
      }
    }
  }

  // Smart game end sound that analyzes result string and player role
  playGameEndSoundSmart(resultString: string, userRole: "white" | "black" | null) {
    if (!this.enabled) return;

    // If spectator or role unknown, just play a generic game end sound
    if (!userRole) {
      this.playEvent("game-end");
      return;
    }

    let soundResult: "victory" | "defeat" | "draw";

    if (resultString.toLowerCase().includes("draw") || resultString.toLowerCase().includes("stalemate")) {
      soundResult = "draw";
    } else {
      // Determine if the user won based on the result string
      const userWon = (userRole === "white" && resultString.includes("White wins")) ||
                     (userRole === "black" && resultString.includes("Black wins"));
      soundResult = userWon ? "victory" : "defeat";
    }

    this.playGameEndSound(soundResult);
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

    this.sounds.forEach((sound) => {
      sound.volume(this.volume);
    });

    this.savePreferences();
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute() {
    this.setEnabled(!this.enabled);
  }

  preloadAll() {
    this.sounds.forEach((sound) => {
      if (sound.state() === "unloaded") {
        sound.load();
      }
    });
  }

  // Get available themes for UI configuration
  getAvailableThemes() {
    return Object.keys(soundThemes);
  }

  // Change sound theme for all sounds
  changeSoundTheme(themeName: keyof typeof soundThemes) {
    const themePath = soundThemes[themeName];
    if (!themePath) return;

    // Update default mappings to use new theme
    const newEventSoundMap: Record<EventType, string | null> = {
      "game-invite": `${themePath}/NewChallenge.mp3`,
      "game-start": `${themePath}/Confirmation.mp3`,
      "ban": `${themePath}/Explosion.mp3`,
      "move": `${themePath}/Move.mp3`,
      "opponent-move": `${themePath}/Move.mp3`,
      "capture": `${themePath}/Capture.mp3`,
      "castle": themeName === 'standard' ? "/sounds/lisp/Castles.mp3" : `${themePath}/Castles.mp3` || `${themePath}/Move.mp3`,
      "check": `${themePath}/Check.mp3`,
      "promote": `${themePath}/Checkmate.mp3`,
      "draw-offer": `${themePath}/GenericNotify.mp3`,
      "time-warning": `${themePath}/LowTime.mp3`,
      "game-end": `${themePath}/Victory.mp3`,
    };

    // Load new sounds and update mappings
    Object.entries(newEventSoundMap).forEach(([eventType, soundFile]) => {
      if (soundFile && !this.sounds.has(soundFile)) {
        this.sounds.set(
          soundFile,
          new Howl({
            src: [soundFile],
            volume: this.volume,
            preload: true,
          }),
        );
      }
      this.setEventSound(eventType as EventType, soundFile);
    });
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
export { soundThemes };
