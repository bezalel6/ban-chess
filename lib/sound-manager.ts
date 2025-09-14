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
  "ban-attempt-mild",
  "ban-attempt-moderate",
  "ban-attempt-severe",
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
export const eventMetadata: Record<
  EventType,
  { name: string; icon: LucideIcon }
> = {
  "game-invite": { name: "Game Invite", icon: Mail },
  "game-start": { name: "Game Start", icon: Play },
  ban: { name: "Ban", icon: Ban },
  "ban-attempt-mild": { name: "Ban Penalty (Mild)", icon: Ban },
  "ban-attempt-moderate": { name: "Ban Penalty (Moderate)", icon: AlertTriangle },
  "ban-attempt-severe": { name: "Ban Penalty (Severe)", icon: Ban },
  move: { name: "Move", icon: Move },
  "opponent-move": { name: "Opponent Move", icon: Users },
  capture: { name: "Capture", icon: Swords },
  castle: { name: "Castle", icon: Castle },
  check: { name: "Check", icon: AlertTriangle },
  promote: { name: "Promote", icon: Crown },
  "draw-offer": { name: "Draw Offer", icon: Handshake },
  "time-warning": { name: "Time Warning", icon: Clock },
  "game-end": { name: "Game End", icon: Trophy },
};

// Sound theme type
export type SoundTheme = string;

// Interface for sound library from API
interface SoundLibrary {
  themes: Record<
    string,
    Array<{ file: string; name: string; displayName: string }>
  >;
}

// Available sounds will be loaded dynamically from the API
let availableSounds: Array<{
  file: string | null;
  name: string;
  theme: string;
}> = [{ file: null, name: "No Sound", theme: "none" }];

// Sound themes will be loaded dynamically from the API
let soundThemes: Record<string, { name: string }> = {};

// Function to load available sounds from the API
async function loadAvailableSounds(): Promise<void> {
  if (typeof window === "undefined") return; // Skip on server

  try {
    const response = await fetch("/api/sounds");
    const data: SoundLibrary = await response.json();

    // Reset available sounds
    availableSounds = [{ file: null, name: "No Sound", theme: "none" }];
    soundThemes = {};

    // Build sound themes and available sounds from API data
    Object.entries(data.themes).forEach(([themeName, sounds]) => {
      // Add theme
      soundThemes[themeName] = {
        name: themeName.charAt(0).toUpperCase() + themeName.slice(1),
      };

      // Add sounds from this theme
      sounds.forEach((sound) => {
        availableSounds.push({
          file: sound.file,
          name: sound.displayName,
          theme: soundThemes[themeName].name,
        });
      });
    });
  } catch (error) {
    console.error("Failed to load sound library:", error);
  }
}

// Export function to get available sounds (loaded dynamically)
export function getAvailableSounds(): Array<{
  file: string | null;
  name: string;
  theme: string;
}> {
  return availableSounds;
}

// Export function to get sound themes (loaded dynamically)
export function getSoundThemes(): Record<string, { name: string }> {
  return soundThemes;
}

// Default sound file for each event type using standard theme
const defaultEventSoundMap: Record<EventType, string | null> = {
  "game-invite": "/sounds/standard/NewChallenge.mp3",
  "game-start": "/sounds/standard/Confirmation.mp3",
  ban: "/sounds/standard/Explosion.mp3",
  "ban-attempt-mild": null, // No sound for mild penalty
  "ban-attempt-moderate": "/sounds/standard/Error.mp3",
  "ban-attempt-severe": "/sounds/futuristic/Explosion.mp3", // The aggressive explosion for severe penalty
  move: "/sounds/standard/Move.mp3",
  "opponent-move": "/sounds/standard/Move.mp3",
  capture: "/sounds/standard/Capture.mp3",
  castle: "/sounds/standard/Move.mp3", // Use Move.mp3 as standard doesn't have Castles.mp3
  check: "/sounds/standard/Check.mp3",
  promote: "/sounds/standard/Checkmate.mp3",
  "draw-offer": "/sounds/standard/GenericNotify.mp3",
  "time-warning": "/sounds/standard/LowTime.mp3",
  "game-end": "/sounds/standard/Victory.mp3",
};

class SoundManager {
  private sounds: Map<string, Howl>;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private eventSoundMap: Record<EventType, string | null>;
  private currentTheme: SoundTheme = "standard";
  private lastPlayedSound: { eventType: string; timestamp: number } | null =
    null;
  private soundDebounceMs = 100; // Prevent duplicate sounds within 100ms
  private isServer: boolean;

  constructor() {
    // Check if we're running on the server
    this.isServer = typeof window === "undefined";

    this.sounds = new Map();
    this.eventSoundMap = { ...defaultEventSoundMap };

    // Only initialize sounds and load preferences on the client
    if (!this.isServer) {
      this.initializeSounds();
      this.loadPreferences();
      // Load available sounds from API
      loadAvailableSounds();
    }
  }

  private initializeSounds() {
    // Only preload the default sounds initially to avoid loading hundreds of files
    // Other sounds will be loaded on-demand when selected
    const defaultSounds = new Set(
      Object.values(defaultEventSoundMap).filter(Boolean)
    );

    defaultSounds.forEach((soundFile) => {
      if (soundFile) {
        const howl = new Howl({
          src: [soundFile],
          volume: this.volume,
          preload: true,
          onload: () => {
            // Successfully loaded
          },
          onloaderror: (id, error) => {
            console.error(`[SoundManager] Failed to load: ${soundFile}`, error);
          },
          onplayerror: (id, error) => {
            console.error(`[SoundManager] Failed to play: ${soundFile}`, error);
          },
        });
        this.sounds.set(soundFile, howl);
      }
    });
  }

  private loadPreferences() {
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("soundEnabled");
      const savedVolume = localStorage.getItem("soundVolume");
      const savedEventMap = localStorage.getItem("soundEventMap");
      const savedTheme = localStorage.getItem("soundTheme");

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === "true";
      }

      if (savedVolume !== null) {
        // Don't call setVolume as it saves preferences again
        this.volume = parseFloat(savedVolume);
        // Update volume for existing sounds
        if (!this.isServer) {
          this.sounds.forEach((sound) => {
            sound.volume(this.volume);
          });
        }
      }

      if (savedTheme !== null) {
        this.currentTheme = savedTheme as SoundTheme;
      }

      if (savedEventMap !== null) {
        try {
          const map = JSON.parse(savedEventMap);
          
          // Migrate old ban-attempt event names to new ones
          let needsSave = false;
          if ('ban-attempt-easy' in map) {
            map['ban-attempt-mild'] = map['ban-attempt-easy'];
            delete map['ban-attempt-easy'];
            needsSave = true;
          }
          if ('ban-attempt-medium' in map) {
            map['ban-attempt-moderate'] = map['ban-attempt-medium'];
            delete map['ban-attempt-medium'];
            needsSave = true;
          }
          if ('ban-attempt-hard' in map) {
            map['ban-attempt-severe'] = map['ban-attempt-hard'];
            delete map['ban-attempt-hard'];
            needsSave = true;
          }
          
          // Ensure new ban-attempt events exist in the map
          if (!('ban-attempt-mild' in map)) {
            map['ban-attempt-mild'] = defaultEventSoundMap['ban-attempt-mild'];
            needsSave = true;
          }
          if (!('ban-attempt-moderate' in map)) {
            map['ban-attempt-moderate'] = defaultEventSoundMap['ban-attempt-moderate'];
            needsSave = true;
          }
          if (!('ban-attempt-severe' in map)) {
            map['ban-attempt-severe'] = defaultEventSoundMap['ban-attempt-severe'];
            needsSave = true;
          }
          
          if (needsSave) {
            // Save the migrated/updated map
            localStorage.setItem("soundEventMap", JSON.stringify(map));
          }
          
          // Saved preferences completely replace defaults
          this.eventSoundMap = map;
          
          // Preload any custom sounds that aren't in defaults
          if (!this.isServer) {
            Object.values(map).forEach((soundFile) => {
              if (soundFile && typeof soundFile === 'string' && !this.sounds.has(soundFile)) {
                this.sounds.set(
                  soundFile,
                  new Howl({
                    src: [soundFile],
                    volume: this.volume,
                    preload: true,
                    onloaderror: () => {
                      console.warn(`Failed to load saved sound: ${soundFile}`);
                    },
                  })
                );
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse sound event map:", e);
          // Fall back to defaults only on parse error
          this.eventSoundMap = { ...defaultEventSoundMap };
        }
      }
    }
  }

  private savePreferences() {
    if (typeof window !== "undefined") {
      localStorage.setItem("soundEnabled", String(this.enabled));
      localStorage.setItem("soundVolume", String(this.volume));
      localStorage.setItem("soundEventMap", JSON.stringify(this.eventSoundMap));
      localStorage.setItem("soundTheme", this.currentTheme);
    }
  }

  // Play sound for a specific event type
  playEvent(
    eventType: EventType,
    context?: { result?: string; playerRole?: "white" | "black" | null }
  ) {
    // Skip on server
    if (this.isServer) return;

    if (!this.enabled) {
      return;
    }

    // Debounce to prevent rapid duplicate sounds
    const now = Date.now();
    if (
      this.lastPlayedSound &&
      this.lastPlayedSound.eventType === eventType &&
      now - this.lastPlayedSound.timestamp < this.soundDebounceMs
    ) {
      return;
    }
    this.lastPlayedSound = { eventType, timestamp: now };

    // Special handling for game-end sounds
    if (eventType === "game-end" && context?.result) {
      this.playGameEndSoundSmart(context.result, context.playerRole || null);
      return;
    }

    const soundFile = this.eventSoundMap[eventType];

    if (!soundFile) {
      return; // No sound mapped for this event
    }

    const sound = this.sounds.get(soundFile);
    if (sound) {
      sound.stop(); // Stop any currently playing instance
      try {
        sound.play();
      } catch (error) {
        console.error(
          `[SoundManager] Failed to play sound ${soundFile}:`,
          error
        );
      }
    } else {
      // Load and play on-demand if not cached
      const newSound = new Howl({
        src: [soundFile],
        volume: this.volume,
        autoplay: true,
        onloaderror: () => {
          console.error(`[SoundManager] Failed to load sound: ${soundFile}`);
        },
      });
      this.sounds.set(soundFile, newSound);
    }
  }

  // Set which sound file to use for a specific event
  setEventSound(eventType: EventType, soundFile: string | null) {
    this.eventSoundMap[eventType] = soundFile;

    // Skip loading on server
    if (this.isServer) {
      return;
    }

    // If it's a new sound file we haven't loaded yet, load it
    if (soundFile && !this.sounds.has(soundFile)) {
      this.sounds.set(
        soundFile,
        new Howl({
          src: [soundFile],
          volume: this.volume,
          preload: true,
        })
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
    // Skip on server
    if (this.isServer) return;

    if (!this.enabled) {
      return;
    }
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
    if (this.isServer || !this.enabled) return;

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
      } else {
        // Load and play on-demand
        const newSound = new Howl({
          src: [soundFile],
          volume: this.volume,
          autoplay: true,
        });
        this.sounds.set(soundFile, newSound);
      }
    }
  }

  // Smart game end sound that analyzes result string and player role
  playGameEndSoundSmart(
    resultString: string,
    userRole: "white" | "black" | null
  ) {
    if (this.isServer || !this.enabled) return;

    // If spectator or role unknown, just play a generic game end sound
    if (!userRole) {
      this.playEvent("game-end");
      return;
    }

    let soundResult: "victory" | "defeat" | "draw";

    if (
      resultString.toLowerCase().includes("draw") ||
      resultString.toLowerCase().includes("stalemate")
    ) {
      soundResult = "draw";
    } else {
      // Determine if the user won based on the result string
      const userWon =
        (userRole === "white" && resultString.includes("White wins")) ||
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

    if (!this.isServer) {
      this.sounds.forEach((sound) => {
        sound.volume(this.volume);
      });
    }

    this.savePreferences();
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute() {
    this.setEnabled(!this.enabled);
  }

  preloadAll() {
    if (this.isServer) return;

    this.sounds.forEach((sound) => {
      if (sound.state() === "unloaded") {
        sound.load();
      }
    });
  }

  // Get available themes for UI configuration
  getAvailableThemes() {
    return getSoundThemes();
  }

  // Get current theme
  getCurrentTheme(): SoundTheme {
    return this.currentTheme;
  }

  // Reset all sounds to a theme's defaults
  // WARNING: This overwrites all custom sound assignments!
  // Only use this for "Reset to Defaults" functionality
  changeSoundTheme(themeName: SoundTheme) {
    const themes = getSoundThemes();
    const theme = themes[themeName];
    if (!theme) return;

    this.currentTheme = themeName;

    // Skip loading on server
    if (this.isServer) {
      this.savePreferences();
      return;
    }

    const themePath = `/sounds/${themeName}`;

    // Map of sound files to try for each event
    const soundFiles = {
      NewChallenge: ["NewChallenge", "GenericNotify"],
      Confirmation: ["Confirmation", "GenericNotify"],
      Explosion: ["Explosion", "Error"],
      Move: ["Move"],
      Capture: ["Capture"],
      Castles: ["Castles", "Move"],
      Check: ["Check"],
      Checkmate: ["Checkmate", "Victory"],
      GenericNotify: ["GenericNotify", "NewPM"],
      LowTime: ["LowTime", "GenericNotify"],
      Victory: ["Victory"],
      Defeat: ["Defeat"],
      Draw: ["Draw"],
      Error: ["Error", "OutOfBound"],
    };

    // Update default mappings to use new theme
    const newEventSoundMap: Record<EventType, string | null> = {
      "game-invite": this.findAvailableSound(
        themePath,
        soundFiles["NewChallenge"]
      ),
      "game-start": this.findAvailableSound(
        themePath,
        soundFiles["Confirmation"]
      ),
      ban: this.findAvailableSound(themePath, soundFiles["Explosion"]),
      "ban-attempt-mild": null, // No sound for mild penalty
      "ban-attempt-moderate": this.findAvailableSound(themePath, soundFiles["Error"]),
      "ban-attempt-severe": "/sounds/futuristic/Explosion.mp3", // Always use futuristic explosion for severe penalty
      move: this.findAvailableSound(themePath, soundFiles["Move"]),
      "opponent-move": this.findAvailableSound(themePath, soundFiles["Move"]),
      capture: this.findAvailableSound(themePath, soundFiles["Capture"]),
      castle:
        this.findAvailableSound(themePath, soundFiles["Castles"]) ||
        this.findAvailableSound(themePath, soundFiles["Move"]) ||
        "/sounds/standard/Move.mp3",
      check: this.findAvailableSound(themePath, soundFiles["Check"]),
      promote: this.findAvailableSound(themePath, soundFiles["Checkmate"]),
      "draw-offer": this.findAvailableSound(
        themePath,
        soundFiles["GenericNotify"]
      ),
      "time-warning": this.findAvailableSound(themePath, soundFiles["LowTime"]),
      "game-end": this.findAvailableSound(themePath, soundFiles["Victory"]),
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
            onloaderror: () => {
              console.warn(`Failed to load sound: ${soundFile}`);
            },
          })
        );
      }
      this.eventSoundMap[eventType as EventType] = soundFile;
    });

    this.savePreferences();
  }

  // Helper to find the first available sound from a list of alternatives
  private findAvailableSound(
    themePath: string,
    alternatives: string[]
  ): string | null {
    for (const soundName of alternatives) {
      const soundFile = `${themePath}/${soundName}.mp3`;
      // For now, we'll assume the file exists and let it fail gracefully if not
      // In a production app, we'd check file existence more robustly
      return soundFile;
    }
    return null;
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Export functions for components to use
export const loadSoundLibrary = loadAvailableSounds;

export default soundManager;
