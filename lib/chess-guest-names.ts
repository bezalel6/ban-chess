/**
 * Chess Culture Guest Name Generator
 * Generates unique, fun guest names from chess culture references
 */

// Chess World Champions and Legends
const chessLegends = [
  'Magnus',
  'Garry',
  'Bobby',
  'Anatoly',
  'Mikhail',
  'Jose',
  'Alexander',
  'Emanuel',
  'Wilhelm',
  'Paul',
  'Tigran',
  'Boris',
  'Vasily',
  'Max',
  'Viswanathan',
  'Vladimir',
  'Fabiano',
  'Hikaru',
  'Wesley',
  'Levon',
  'Judit',
  'Hou',
  'Yifan',
  'Polgar',
  'Kosteniuk',
  'Muzychuk',
  'Lagno',
  'Carlsen',
  'Kasparov',
  'Fischer',
  'Karpov',
  'Tal',
  'Capablanca',
  'Alekhine',
  'Lasker',
  'Morphy',
  'Petrosian',
  'Spassky',
  'Smyslov',
  'Euwe',
  'Botvinnik',
  'Anand',
  'Kramnik',
  'Caruana',
  'Nakamura',
  'So',
  'Aronian',
  'Ding',
  'Nepo',
  'Giri',
  'Mamedyarov',
  'Grischuk',
  'Vachier',
  'Lagrave',
  'Radjabov',
];

// Chess Streamers and Content Creators
const chessStreamers = [
  'Levy',
  'Gotham',
  'Eric',
  'Rosen',
  'Anna',
  'Rudolf',
  'Agadmator',
  'Hikaru',
  'BotezLive',
  'Alexandra',
  'Andrea',
  'Danya',
  'Naroditsky',
  'ChessNerd',
  'Nemsko',
  'Qiyu',
  'Nemo',
  'Zhou',
  'GingerGM',
  'Simon',
  'Williams',
  'Bartholomew',
  'John',
  'Finegold',
  'Ben',
  'Hess',
  'Robert',
  'Canty',
  'James',
  'Antonio',
  'Radic',
  'Sagar',
  'Shah',
  'Samay',
  'Raina',
];

// Chess Pieces and Terms
const chessTerms = [
  'Knight',
  'Bishop',
  'Rook',
  'Queen',
  'King',
  'Pawn',
  'Castle',
  'Check',
  'Mate',
  'Fork',
  'Pin',
  'Skewer',
  'Gambit',
  'Fianchetto',
  'Zugzwang',
  'Endgame',
  'Opening',
  'Middlegame',
  'Blitz',
  'Bullet',
  'Rapid',
  'Classical',
  'EnPassant',
  'Stalemate',
  'Checkmate',
  'Draw',
  'Sacrifice',
  'Blunder',
  'Brilliancy',
  'Tempo',
  'Initiative',
  'Counterplay',
  'Fortress',
  'Windmill',
  'Discovery',
  'Deflection',
  'Decoy',
  'Clearance',
  'Interference',
  'Zwischenzug',
];

// Famous Chess Openings
const chessOpenings = [
  'Sicilian',
  'French',
  'CaroKann',
  'Italian',
  'Spanish',
  'Ruy',
  'Lopez',
  'Queens',
  'Kings',
  'Indian',
  'Nimzo',
  'Grunfeld',
  'Benoni',
  'Dutch',
  'English',
  'Catalan',
  'Slav',
  'London',
  'Vienna',
  'Scotch',
  'Russian',
  'Petroff',
  'Philidor',
  'Scandinavian',
  'Alekhine',
  'Pirc',
  'Modern',
  'Dragon',
  'Najdorf',
  'Scheveningen',
  'Sveshnikov',
  'Accelerated',
  'Hyper',
  'Benko',
  'Budapest',
  'Albin',
  'Baltic',
  'Birds',
  'Reti',
  'Larsen',
];

// Chess-related Adjectives
const chessAdjectives = [
  'Tactical',
  'Strategic',
  'Brilliant',
  'Sharp',
  'Solid',
  'Dynamic',
  'Quiet',
  'Aggressive',
  'Positional',
  'Calculating',
  'Intuitive',
  'Creative',
  'Precise',
  'Bold',
  'Cunning',
  'Fearless',
  'Legendary',
  'Epic',
  'Master',
  'Grand',
  'Swift',
  'Sneaky',
  'Clever',
  'Wise',
  'Noble',
  'Brave',
  'Quick',
  'Keen',
  'Fierce',
  'Mighty',
  'Royal',
  'Elite',
  'Supreme',
  'Ultimate',
  'Prime',
  'Savage',
  'Ruthless',
  'Merciless',
  'Unstoppable',
  'Invincible',
  'Immortal',
];

// Fun Chess Memes and References
const chessMemes = [
  'Bongcloud',
  'Botez',
  'Gambit',
  'Declined',
  'Accepted',
  'TheRook',
  'ItHung',
  'MouseSlip',
  'Flagged',
  'Premove',
  'Theory',
  'Prep',
  'OTB',
  'Online',
  'Titled',
  'Untitled',
  'Patzer',
  'WoodPusher',
  'CoffeeHouse',
  'Kibitzer',
  'Sandbagger',
  'TimeScramble',
  'Berserker',
  'Arena',
  'Puzzle',
  'Rush',
  'Storm',
  'Streak',
  'Marathon',
  'Variant',
  'Chess960',
  'FischerRandom',
  'Crazyhouse',
  'Bughouse',
  'ThreeCheck',
  'KingOfTheHill',
  'Horde',
  'Atomic',
];

// Chess Notation and Symbols
const chessSymbols = [
  '!',
  '!!',
  '?',
  '??',
  '!?',
  '?!',
  '+=',
  '=+',
  '+−',
  '−+',
  '=',
  '∞',
  '⩲',
  '⩱',
  '±',
  '∓',
  '□',
  '⟳',
  '⊕',
  '⊖',
  '○',
  '●',
  '↑',
  '→',
  '⇆',
  '⇔',
];

// Special Characters for flair
const specialChars = [
  'ツ',
  '♟',
  '♞',
  '♝',
  '♜',
  '♛',
  '♚',
  '♔',
  '♕',
  '♖',
  '♗',
  '♘',
  '♙',
  '⚔',
  '🗡',
  '👑',
  '🏰',
  '⚡',
  '💀',
  '🔥',
  '❄',
  '✨',
  '💫',
  '⭐',
  '🌟',
  '×',
  '÷',
  '±',
  '∞',
  '≈',
  '≠',
  '≤',
  '≥',
  'Δ',
  'Σ',
  'Ω',
  'α',
  'β',
  'γ',
];

// Chess Ratings and Titles
const chessTitles = [
  'GM',
  'IM',
  'FM',
  'CM',
  'NM',
  'WGM',
  'WIM',
  'WFM',
  'WCM',
  'WNM',
  '800',
  '1000',
  '1200',
  '1400',
  '1600',
  '1800',
  '2000',
  '2200',
  '2400',
  '2600',
  '2700',
  '2800',
  '2900',
  '3000',
  '3200',
  'ELO',
  'FIDE',
  'USCF',
  'ECF',
];

// Chess Engines and Bots
const chessEngines = [
  'Stockfish',
  'Leela',
  'Zero',
  'Komodo',
  'Dragon',
  'Houdini',
  'Fire',
  'Ethereal',
  'Laser',
  'Andscacs',
  'Booot',
  'Fizbo',
  'Gull',
  'Rybka',
  'Fritz',
  'Shredder',
  'Junior',
  'AlphaZero',
  'DeepBlue',
  'DeepMind',
];

// Countries with Strong Chess Culture
const chessCountries = [
  'Russian',
  'Soviet',
  'Indian',
  'Chinese',
  'American',
  'Norwegian',
  'Dutch',
  'French',
  'German',
  'English',
  'Spanish',
  'Italian',
  'Polish',
  'Ukrainian',
  'Armenian',
  'Georgian',
  'Azerbaijani',
  'Israeli',
  'Cuban',
  'Hungarian',
];

// Time Controls
const timeControls = [
  'Bullet',
  'Blitz',
  'Rapid',
  'Classical',
  'Correspondence',
  'UltraBullet',
  'HyperBullet',
  'Lightning',
  'Speed',
  'Marathon',
  'Daily',
  'Live',
];

/**
 * Get a random element from an array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a chess-themed guest name
 */
export function generateChessGuestName(): string {
  // Different name generation patterns
  const patterns = [
    // Pattern 1: Adjective + Chess Legend
    () =>
      `${getRandomElement(chessAdjectives)}${getRandomElement(chessLegends)}`,

    // Pattern 2: Chess Term + Number
    () => `${getRandomElement(chessTerms)}${Math.floor(Math.random() * 999)}`,

    // Pattern 3: Opening + Player Style
    () =>
      `${getRandomElement(chessOpenings)}${getRandomElement(['Master', 'Player', 'Fan', 'Theory', 'Main'])}`,

    // Pattern 4: Streamer Reference + Meme
    () => `${getRandomElement(chessStreamers)}${getRandomElement(chessMemes)}`,

    // Pattern 5: Title + Legend Name
    () => `${getRandomElement(chessTitles)}${getRandomElement(chessLegends)}`,

    // Pattern 6: Country + Chess Term
    () => `${getRandomElement(chessCountries)}${getRandomElement(chessTerms)}`,

    // Pattern 7: Engine + Rating
    () =>
      `${getRandomElement(chessEngines)}${getRandomElement(['2000', '2500', '3000', '9000'])}`,

    // Pattern 8: Time Control + Adjective
    () =>
      `${getRandomElement(timeControls)}${getRandomElement(chessAdjectives).slice(0, -2)}er`,

    // Pattern 9: Meme + Symbol
    () => `${getRandomElement(chessMemes)}${getRandomElement(chessSymbols)}`,

    // Pattern 10: Two Part Legend Name
    () => {
      const legend = getRandomElement(chessLegends);
      const suffix = getRandomElement([
        'Jr',
        'Sr',
        '2.0',
        'Pro',
        'Max',
        'Plus',
        'Ultra',
      ]);
      return `${legend}${suffix}`;
    },

    // Pattern 11: Chess Piece + Adjective
    () => {
      const pieces = ['Knight', 'Bishop', 'Rook', 'Queen', 'King', 'Pawn'];
      const adjective = getRandomElement(chessAdjectives);
      return `${adjective}${getRandomElement(pieces)}`;
    },

    // Pattern 12: Famous Game Reference
    () => {
      const games = ['Immortal', 'Evergreen', 'Opera', 'Game6', 'Match'];
      const year = 1900 + Math.floor(Math.random() * 124); // 1900-2024
      return `${getRandomElement(games)}${year}`;
    },

    // Pattern 13: Special Character + Name
    () => `${getRandomElement(specialChars)}${getRandomElement(chessLegends)}`,

    // Pattern 14: Double Chess Term
    () => `${getRandomElement(chessTerms)}${getRandomElement(chessTerms)}`,

    // Pattern 15: Streamer Style Username
    () => {
      const prefix = getRandomElement(['xX', 'The', '', 'Pro', 'GM']);
      const name = getRandomElement([...chessStreamers, ...chessLegends]);
      const suffix = getRandomElement(['Xx', 'YT', 'TV', 'Live', '']);
      return `${prefix}${name}${suffix}`;
    },
  ];

  // Select a random pattern and generate the name
  const pattern = getRandomElement(patterns);
  let name = pattern();

  // Ensure name is within reasonable length (3-20 characters)
  if (name.length > 20) {
    name = name.substring(0, 20);
  }

  // Add random number if name is too short or for extra uniqueness (30% chance)
  if (name.length < 5 || Math.random() < 0.3) {
    name += Math.floor(Math.random() * 999);
  }

  return name;
}

/**
 * Generate a unique chess guest name with collision handling
 * This is a wrapper that could check against existing names if needed
 */
export async function generateUniqueChessGuestName(
  existingNames?: Set<string>
): Promise<string> {
  let attempts = 0;
  let name = generateChessGuestName();

  // If we have a list of existing names, ensure uniqueness
  while (existingNames?.has(name) && attempts < 100) {
    name = generateChessGuestName();
    attempts++;
  }

  // If still not unique after 100 attempts, append timestamp
  if (existingNames?.has(name)) {
    name = `${name}${Date.now().toString().slice(-4)}`;
  }

  return name;
}

// Export name lists for potential use elsewhere
export {
  chessLegends,
  chessStreamers,
  chessTerms,
  chessOpenings,
  chessAdjectives,
  chessMemes,
  chessTitles,
  chessEngines,
  chessCountries,
  timeControls,
  specialChars,
};
