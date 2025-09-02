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
export const soundThemes = {
  standard: { path: "/sounds/standard", name: "Standard" },
  lisp: { path: "/sounds/lisp", name: "Lisp" },
  piano: { path: "/sounds/piano", name: "Piano" },
  futuristic: { path: "/sounds/futuristic", name: "Futuristic" },
  nes: { path: "/sounds/nes", name: "NES Retro" },
  robot: { path: "/sounds/robot", name: "Robot" },
  sfx: { path: "/sounds/sfx", name: "SFX" },
  woodland: { path: "/sounds/woodland", name: "Woodland" },
  instrument: { path: "/sounds/instrument", name: "Instrument" },
} as const;

export type SoundTheme = keyof typeof soundThemes;

// Common sound types available across themes
const commonSoundTypes = [
  "Move", "Capture", "Check", "Checkmate", "Victory", "Defeat", "Draw",
  "NewChallenge", "Confirmation", "GenericNotify", "LowTime", "Explosion",
  "Error", "Berserk", "CountDown0", "CountDown1", "CountDown2", "CountDown3",
  "CountDown4", "CountDown5", "CountDown6", "CountDown7", "CountDown8",
  "CountDown9", "CountDown10", "NewPM", "OutOfBound", "Tournament1st",
  "Tournament2nd", "Tournament3rd", "TournamentOther"
];

// Comprehensive sound library organized by theme
export const themeSoundLibrary: Record<string, Array<{ file: string; name: string; displayName: string }>> = {
  standard: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1", 
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7", 
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound", "Select",
    "SocialNotify", "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/standard/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  piano: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/piano/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  nes: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/nes/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  lisp: [
    "Berserk", "Capture", "Castles", "Check", "Checkmate", "Confirmation", "CountDown0",
    "CountDown1", "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6",
    "CountDown7", "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error",
    "Explosion", "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound",
    "PracticeComplete", "PuzzleStormEnd", "PuzzleStormGood", "Tournament1st", "Tournament2nd",
    "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/lisp/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  futuristic: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewChatMessage", "NewPM", "OutOfBound",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/futuristic/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  robot: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/robot/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  sfx: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM", "OutOfBound",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/sfx/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  woodland: [
    "Berserk", "Capture", "Check", "Checkmate", "Confirmation", "CountDown0", "CountDown1",
    "CountDown2", "CountDown3", "CountDown4", "CountDown5", "CountDown6", "CountDown7",
    "CountDown8", "CountDown9", "CountDown10", "Defeat", "Draw", "Error", "Explosion",
    "GenericNotify", "LowTime", "Move", "NewChallenge", "NewPM",
    "Tournament1st", "Tournament2nd", "Tournament3rd", "TournamentOther", "Victory"
  ].map(s => ({ 
    file: `/sounds/woodland/${s}.mp3`, 
    name: s,
    displayName: s.replace(/([A-Z])/g, ' $1').replace(/Count Down/, 'Countdown ').trim()
  })),
  
  other: [
    { file: "/sounds/other/energy3.mp3", name: "energy3", displayName: "Energy" },
    { file: "/sounds/other/failure2.mp3", name: "failure2", displayName: "Failure" },
    { file: "/sounds/other/gewonnen.mp3", name: "gewonnen", displayName: "Gewonnen" },
    { file: "/sounds/other/guitar.mp3", name: "guitar", displayName: "Guitar" },
    { file: "/sounds/other/no-go.mp3", name: "no-go", displayName: "No Go" },
    { file: "/sounds/other/ping.mp3", name: "ping", displayName: "Ping" },
    { file: "/sounds/other/yeet.mp3", name: "yeet", displayName: "Yeet" },
  ],
  
  instrument: [
    // Celesta sounds
    ...Array.from({ length: 27 }, (_, i) => ({
      file: `/sounds/instrument/celesta/c${String(i + 1).padStart(3, '0')}.mp3`,
      name: `celesta-c${i + 1}`,
      displayName: `Celesta ${i + 1}`
    })),
    // Clav sounds
    ...Array.from({ length: 27 }, (_, i) => ({
      file: `/sounds/instrument/clav/c${String(i + 1).padStart(3, '0')}.mp3`,
      name: `clav-c${i + 1}`,
      displayName: `Clav ${i + 1}`
    })),
    // Swells
    { file: "/sounds/instrument/swells/swell1.mp3", name: "swell1", displayName: "Swell 1" },
    { file: "/sounds/instrument/swells/swell2.mp3", name: "swell2", displayName: "Swell 2" },
    { file: "/sounds/instrument/swells/swell3.mp3", name: "swell3", displayName: "Swell 3" },
    // Special
    { file: "/sounds/instrument/Error.mp3", name: "instrument-error", displayName: "Error" },
    { file: "/sounds/instrument/OutOfBound.mp3", name: "instrument-oob", displayName: "Out of Bound" },
  ]
};

// Build comprehensive list of all available sounds from all themes
function buildAvailableSounds(): Array<{ file: string | null; name: string; theme: string }> {
  const sounds: Array<{ file: string | null; name: string; theme: string }> = [
    { file: null, name: "No Sound", theme: "none" }
  ];

  // Add all sounds from the library
  Object.entries(themeSoundLibrary).forEach(([themeKey, themeSounds]) => {
    const themeName = soundThemes[themeKey as SoundTheme]?.name || themeKey;
    themeSounds.forEach(sound => {
      sounds.push({
        file: sound.file,
        name: sound.displayName,
        theme: themeName
      });
    });
  });

  return sounds;
}

export const availableSounds = buildAvailableSounds();

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
  private currentTheme: SoundTheme = "standard";
  private lastPlayedSound: { eventType: string; timestamp: number } | null = null;
  private soundDebounceMs = 100; // Prevent duplicate sounds within 100ms

  constructor() {
    console.log(`[SoundManager] Constructing SoundManager...`);
    this.sounds = new Map();
    this.eventSoundMap = { ...defaultEventSoundMap };
    console.log(`[SoundManager] Default event sound map:`, this.eventSoundMap);
    this.initializeSounds();
    this.loadPreferences();
    console.log(`[SoundManager] SoundManager constructed. Enabled: ${this.enabled}, Volume: ${this.volume}, Theme: ${this.currentTheme}`);
  }

  private initializeSounds() {
    console.log(`[SoundManager] Initializing sounds...`);
    // Only preload the default sounds initially to avoid loading hundreds of files
    // Other sounds will be loaded on-demand when selected
    const defaultSounds = new Set(Object.values(defaultEventSoundMap).filter(Boolean));
    
    defaultSounds.forEach((soundFile) => {
      if (soundFile) {
        console.log(`[SoundManager] Loading sound: ${soundFile}`);
        const howl = new Howl({
          src: [soundFile],
          volume: this.volume,
          preload: true,
          onload: () => {
            console.log(`[SoundManager] Successfully loaded: ${soundFile}`);
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
    console.log(`[SoundManager] Initialized ${this.sounds.size} sounds`);
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
        this.setVolume(parseFloat(savedVolume));
      }

      if (savedTheme !== null && savedTheme in soundThemes) {
        this.currentTheme = savedTheme as SoundTheme;
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
      localStorage.setItem("soundTheme", this.currentTheme);
    }
  }

  // Play sound for a specific event type
  playEvent(eventType: EventType, context?: { result?: string; playerRole?: "white" | "black" | null }) {
    console.log(`[SoundManager] playEvent called: ${eventType}, enabled: ${this.enabled}`);
    
    if (!this.enabled) {
      console.log(`[SoundManager] Sound disabled, skipping ${eventType}`);
      return;
    }

    // Debounce to prevent rapid duplicate sounds
    const now = Date.now();
    if (this.lastPlayedSound && 
        this.lastPlayedSound.eventType === eventType && 
        (now - this.lastPlayedSound.timestamp) < this.soundDebounceMs) {
      console.log(`[SoundManager] Debouncing duplicate ${eventType} sound`);
      return;
    }
    this.lastPlayedSound = { eventType, timestamp: now };

    // Special handling for game-end sounds
    if (eventType === "game-end" && context?.result) {
      console.log(`[SoundManager] Playing game-end sound for result: ${context.result}, role: ${context.playerRole}`);
      this.playGameEndSoundSmart(context.result, context.playerRole || null);
      return;
    }

    const soundFile = this.eventSoundMap[eventType];
    console.log(`[SoundManager] Sound file for ${eventType}: ${soundFile}`);
    
    if (!soundFile) {
      console.warn(`[SoundManager] No sound mapped for event: ${eventType}`);
      return; // No sound mapped for this event
    }

    const sound = this.sounds.get(soundFile);
    if (sound) {
      console.log(`[SoundManager] Playing sound: ${soundFile}`);
      sound.stop(); // Stop any currently playing instance
      try {
        sound.play();
      } catch (error) {
        console.error(`[SoundManager] Failed to play sound ${soundFile}:`, error);
      }
    } else {
      console.error(`[SoundManager] Sound not found in cache: ${soundFile}`);
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
    console.log(`[SoundManager] playMoveSound called:`, moveDetails, `enabled: ${this.enabled}`);
    
    if (!this.enabled) {
      console.log(`[SoundManager] Sound disabled, skipping move sound`);
      return;
    }

    // Priority order for sounds - play the most specific event
    if (moveDetails.check) {
      console.log(`[SoundManager] Playing check sound`);
      this.playEvent("check");
    } else if (moveDetails.castle) {
      console.log(`[SoundManager] Playing castle sound`);
      this.playEvent("castle");
    } else if (moveDetails.promotion) {
      console.log(`[SoundManager] Playing promotion sound`);
      this.playEvent("promote");
    } else if (moveDetails.capture) {
      console.log(`[SoundManager] Playing capture sound`);
      this.playEvent("capture");
    } else if (moveDetails.isOpponent) {
      console.log(`[SoundManager] Playing opponent move sound`);
      this.playEvent("opponent-move");
    } else {
      console.log(`[SoundManager] Playing regular move sound`);
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
    return soundThemes;
  }

  // Get current theme
  getCurrentTheme(): SoundTheme {
    return this.currentTheme;
  }

  // Change sound theme for all sounds
  changeSoundTheme(themeName: SoundTheme) {
    const theme = soundThemes[themeName];
    if (!theme) return;

    this.currentTheme = themeName;
    const themePath = theme.path;

    // Special handling for certain themes that might not have all sounds
    // We'll first check if files exist by trying to load them
    const soundFiles = {
      "NewChallenge": ["NewChallenge", "GenericNotify"],
      "Confirmation": ["Confirmation", "GenericNotify"],
      "Explosion": ["Explosion", "Error"],
      "Move": ["Move"],
      "Capture": ["Capture"],
      "Castles": ["Castles", "Move"],
      "Check": ["Check"],
      "Checkmate": ["Checkmate", "Victory"],
      "GenericNotify": ["GenericNotify", "NewPM"],
      "LowTime": ["LowTime", "GenericNotify"],
      "Victory": ["Victory"],
      "Defeat": ["Defeat"],
      "Draw": ["Draw"],
      "Error": ["Error", "OutOfBound"],
    };

    // Update default mappings to use new theme
    const newEventSoundMap: Record<EventType, string | null> = {
      "game-invite": this.findAvailableSound(themePath, soundFiles["NewChallenge"]),
      "game-start": this.findAvailableSound(themePath, soundFiles["Confirmation"]),
      "ban": this.findAvailableSound(themePath, soundFiles["Explosion"]),
      "move": this.findAvailableSound(themePath, soundFiles["Move"]),
      "opponent-move": this.findAvailableSound(themePath, soundFiles["Move"]),
      "capture": this.findAvailableSound(themePath, soundFiles["Capture"]),
      "castle": this.findAvailableSound(themePath, soundFiles["Castles"]) || "/sounds/lisp/Castles.mp3",
      "check": this.findAvailableSound(themePath, soundFiles["Check"]),
      "promote": this.findAvailableSound(themePath, soundFiles["Checkmate"]),
      "draw-offer": this.findAvailableSound(themePath, soundFiles["GenericNotify"]),
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
            }
          }),
        );
      }
      this.eventSoundMap[eventType as EventType] = soundFile;
    });

    this.savePreferences();
  }

  // Helper to find the first available sound from a list of alternatives
  private findAvailableSound(themePath: string, alternatives: string[]): string | null {
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

export default soundManager;
