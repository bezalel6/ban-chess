// Sound theme definitions and mappings (following lichess.org)
export const soundThemes = [
  'standard',
  'futuristic',
  'piano',
  'robot',
  'sfx',
  'nes',
  'lisp',
  'woodland',
  'instrument',
  'pirate',
] as const;

export type SoundTheme = (typeof soundThemes)[number];

// Theme metadata for display
export const themeMetadata: Record<
  SoundTheme,
  {
    name: string;
    description: string;
    color: string;
    unlockable?: boolean;
  }
> = {
  standard: {
    name: 'Standard',
    description: 'Classic chess sounds',
    color: 'bg-gray-600',
  },
  futuristic: {
    name: 'Futuristic',
    description: 'Sci-fi themed sounds',
    color: 'bg-blue-600',
  },
  piano: {
    name: 'Piano',
    description: 'Musical piano notes',
    color: 'bg-purple-600',
  },
  robot: {
    name: 'Robot',
    description: 'Robotic voice sounds',
    color: 'bg-cyan-600',
  },
  sfx: {
    name: 'SFX',
    description: 'Sound effects',
    color: 'bg-orange-600',
  },
  nes: {
    name: 'NES',
    description: 'Retro 8-bit sounds',
    color: 'bg-red-600',
  },
  lisp: {
    name: 'Lisp',
    description: 'Speech synthesis sounds',
    color: 'bg-green-600',
  },
  woodland: {
    name: 'Woodland',
    description: 'Nature-inspired sounds',
    color: 'bg-green-700',
  },
  instrument: {
    name: 'Instrument',
    description: 'Various instruments',
    color: 'bg-indigo-600',
  },
  pirate: {
    name: 'Pirate',
    description: 'Ahoy! Pirate-themed sounds',
    color: 'bg-yellow-600',
    unlockable: true,
  },
};

// Map our event types to lichess sound files
export const eventToSoundFile: Record<string, string> = {
  'game-invite': 'NewChallenge',
  'game-start': 'GenericNotify',
  ban: 'Explosion',
  move: 'Move',
  'opponent-move': 'Move',
  capture: 'Capture',
  castle: 'Move', // Most themes don't have specific castle sound
  check: 'Check',
  promote: 'GenericNotify',
  'draw-offer': 'GenericNotify',
  'time-warning': 'LowTime',
  'game-end': 'Victory',
};

// Track which sound files exist for each theme
const themeSoundAvailability: Record<SoundTheme, string[]> = {
  standard: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  futuristic: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  piano: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  robot: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  sfx: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  nes: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  lisp: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  woodland: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'Draw',
    'GenericNotify',
    'Explosion',
    'LowTime',
    'NewChallenge',
  ],
  instrument: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Defeat',
    'NewChallenge',
    'GenericNotify',
    'Explosion',
    'LowTime',
  ],
  pirate: [
    'Move',
    'Capture',
    'Check',
    'Victory',
    'Explosion',
    'GenericNotify',
    'LowTime',
    'NewChallenge',
  ],
};

// Check if a sound exists for a theme
export function soundExistsForTheme(
  theme: SoundTheme,
  soundFile: string
): boolean {
  return themeSoundAvailability[theme]?.includes(soundFile) ?? false;
}

// Get full path to a local sound file (lichess sounds)
export function getSoundPath(
  theme: SoundTheme,
  event: string,
  format: 'mp3' | 'ogg' = 'mp3'
): string | null {
  const soundFile = eventToSoundFile[event];
  if (!soundFile) return null;

  // Check if this sound exists for the theme
  if (!soundExistsForTheme(theme, soundFile)) {
    // Fallback to standard theme
    if (theme !== 'standard' && soundExistsForTheme('standard', soundFile)) {
      theme = 'standard';
    } else {
      return null;
    }
  }

  // For instrument theme, use special instrument sounds
  if (theme === 'instrument') {
    // Map specific events to instrument notes
    const instrumentMap: Record<string, string> = {
      Move: '/sounds/instrument/celesta/c003',
      Capture: '/sounds/instrument/celesta/c007',
      Check: '/sounds/instrument/celesta/c015',
      Victory: '/sounds/instrument/swells/swell1',
      Defeat: '/sounds/instrument/swells/swell3',
      NewChallenge: '/sounds/instrument/celesta/c001',
      GenericNotify: '/sounds/instrument/celesta/c001',
      Explosion: '/sounds/instrument/swells/swell2',
      LowTime: '/sounds/instrument/celesta/c020',
    };
    const instrumentFile = instrumentMap[soundFile];
    if (instrumentFile) {
      return `${instrumentFile}.${format}`;
    }
  }

  // Special path for pirate theme (simplified sounds)
  if (theme === 'pirate') {
    return `/sounds/pirate/${soundFile}.mp3`;
  }

  // Standard path for lichess themes
  return `/sounds/${theme}/${soundFile}.${format}`;
}

// Get all sounds for a theme
export function getThemeSounds(theme: SoundTheme): Record<string, string> {
  const sounds: Record<string, string> = {};

  for (const [event] of Object.entries(eventToSoundFile)) {
    const soundPath = getSoundPath(theme, event);
    if (soundPath) {
      sounds[event] = soundPath;
    }
  }

  return sounds;
}
