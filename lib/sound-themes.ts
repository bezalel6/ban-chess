// Sound theme definitions and mappings
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
    name: 'Chess.com',
    description: 'Sounds from chess.com',
    color: 'bg-green-600',
    unlockable: true,
  },
};

// Map our event types to theme sound files
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

// Get full URL to a sound file from chess.com
export function getSoundPath(
  theme: SoundTheme,
  event: string,
  format: 'mp3' | 'ogg' = 'mp3'
): string | null {
  const soundFile = eventToSoundFile[event];
  if (!soundFile) return null;

  // Map our themes to chess.com themes
  const chessComThemeMap: Record<SoundTheme, string> = {
    standard: 'default',
    futuristic: 'futuristic',
    piano: 'piano',
    robot: 'robot',
    sfx: 'sfx',
    nes: 'nes',
    lisp: 'lisp',
    woodland: 'woodland',
    instrument: 'instrument',
    pirate: 'default', // Use default for chess.com sounds
  };

  const chessComTheme = chessComThemeMap[theme];

  // Map our generic sound names to chess.com specific files
  const chessComSoundMap: Record<string, string> = {
    NewChallenge: 'notify',
    GenericNotify: 'notify',
    Explosion: 'boom',
    Move: 'move-self',
    Capture: 'capture',
    Check: 'move-check',
    LowTime: 'tenseconds',
    Victory: 'game-end',
  };

  const chessComFile = chessComSoundMap[soundFile] || soundFile.toLowerCase();

  return `https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/${chessComTheme}/${chessComFile}.${format}`;
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
