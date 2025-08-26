import { Howl } from "howler";

export type SoundType =
  | "move"
  | "capture"
  | "castle"
  | "check"
  | "promote"
  | "opponent-move"
  | "game-start"
  | "game-end"
  | "ban";

class SoundManager {
  private sounds: Map<SoundType, Howl>;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.sounds = new Map();
    this.initializeSounds();
    this.loadPreferences();
  }

  private initializeSounds() {
    const soundFiles: Record<SoundType, string> = {
      move: "/sounds/move.wav",
      capture: "/sounds/capture.wav",
      castle: "/sounds/castle.wav",
      check: "/sounds/check.wav",
      promote: "/sounds/promote.wav",
      "opponent-move": "/sounds/opponent-move.wav",
      "game-start": "/sounds/game-start.wav",
      "game-end": "/sounds/game-end.wav",
      ban: "/sounds/ban.wav",
    };

    Object.entries(soundFiles).forEach(([type, src]) => {
      this.sounds.set(
        type as SoundType,
        new Howl({
          src: [src],
          volume: this.volume,
          preload: true,
        }),
      );
    });
  }

  private loadPreferences() {
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("soundEnabled");
      const savedVolume = localStorage.getItem("soundVolume");

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === "true";
      }

      if (savedVolume !== null) {
        this.setVolume(parseFloat(savedVolume));
      }
    }
  }

  private savePreferences() {
    if (typeof window !== "undefined") {
      localStorage.setItem("soundEnabled", String(this.enabled));
      localStorage.setItem("soundVolume", String(this.volume));
    }
  }

  play(type: SoundType) {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      sound.stop(); // Stop any currently playing instance
      sound.play();
    }
  }

  playMoveSound(moveDetails: {
    capture?: boolean;
    castle?: boolean;
    check?: boolean;
    promotion?: boolean;
    isOpponent?: boolean;
  }) {
    if (!this.enabled) return;

    // Priority order for sounds
    if (moveDetails.check) {
      this.play("check");
    } else if (moveDetails.castle) {
      this.play("castle");
    } else if (moveDetails.promotion) {
      this.play("promote");
    } else if (moveDetails.capture) {
      this.play("capture");
    } else if (moveDetails.isOpponent) {
      this.play("opponent-move");
    } else {
      this.play("move");
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
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;
