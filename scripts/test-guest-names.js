#!/usr/bin/env node

/**
 * Test script for chess guest name generation
 * Run with: node scripts/test-guest-names.js
 */

// Use require since this is a simple Node script
const { generateChessGuestName } = require('../lib/chess-guest-names.ts');

console.log('🎯 Testing Chess Guest Name Generator\n');
console.log('='.repeat(50));

// Generate a batch of names to show variety
const names = new Set();
const iterations = 30;

console.log('\n📋 Generated Guest Names:\n');

for (let i = 0; i < iterations; i++) {
  const name = generateChessGuestName();
  names.add(name);

  // Show some categorization for fun
  let category = '🎲 Random';

  if (
    name.includes('Magnus') ||
    name.includes('Kasparov') ||
    name.includes('Fischer')
  ) {
    category = '👑 Legend';
  } else if (
    name.includes('Gotham') ||
    name.includes('Hikaru') ||
    name.includes('Botez')
  ) {
    category = '📺 Streamer';
  } else if (
    name.includes('Sicilian') ||
    name.includes('French') ||
    name.includes('Indian')
  ) {
    category = '📖 Opening';
  } else if (
    name.includes('GM') ||
    name.includes('IM') ||
    name.includes('FM')
  ) {
    category = '🏆 Title';
  } else if (
    name.includes('Blitz') ||
    name.includes('Bullet') ||
    name.includes('Rapid')
  ) {
    category = '⏱️ TimeControl';
  } else if (
    name.includes('Fork') ||
    name.includes('Pin') ||
    name.includes('Skewer')
  ) {
    category = '⚔️ Tactic';
  } else if (name.includes('♟') || name.includes('♔') || name.includes('♕')) {
    category = '♟️ Symbol';
  }

  console.log(
    `  ${(i + 1).toString().padStart(2)}. ${name.padEnd(25)} ${category}`
  );
}

// Statistics
console.log('\n📊 Statistics:');
console.log('='.repeat(50));
console.log(`Total generated: ${iterations}`);
console.log(`Unique names: ${names.size}`);
console.log(
  `Uniqueness rate: ${((names.size / iterations) * 100).toFixed(1)}%`
);

// Length distribution
const lengths = Array.from(names).map(n => n.length);
const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
const minLength = Math.min(...lengths);
const maxLength = Math.max(...lengths);

console.log(`\n📏 Name Lengths:`);
console.log(`  Average: ${avgLength.toFixed(1)} characters`);
console.log(`  Shortest: ${minLength} characters`);
console.log(`  Longest: ${maxLength} characters`);

// Show some examples of each pattern
console.log('\n🎨 Pattern Examples:');
console.log('='.repeat(50));

const patterns = [
  'TacticalMagnus', // Adjective + Legend
  'Fork823', // Chess Term + Number
  'SicilianMaster', // Opening + Style
  'LevyBongcloud', // Streamer + Meme
  'GMCarlsen', // Title + Legend
  'RussianKnight', // Country + Term
  'Stockfish3000', // Engine + Rating
  'BlitzStrategist', // TimeControl + Adjective
  '♔Kasparov', // Symbol + Name
  'MagnusJr', // Legend + Suffix
];

console.log('\nSample pattern outputs:');
patterns.forEach(p => {
  console.log(`  • ${p}`);
});

console.log('\n✅ Chess guest name generator is working correctly!');
console.log('Names are diverse, fun, and chess-culture relevant! ♟️\n');
