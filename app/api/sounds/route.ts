import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Yoinks sounds extracted from yoink.html - external Chess.com CDN sounds
const YOINKS_SOUNDS = [
  { name: "tenseconds", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3" },
  { name: "puzzle-correct-2", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct-2.mp3" },
  { name: "illegal", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3" },
  { name: "shoutout", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/shoutout.mp3" },
  { name: "premove", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3" },
  { name: "puzzle-correct", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct.mp3" },
  { name: "move-self-check", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self-check.mp3" },
  { name: "move-check", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3" },
  { name: "incorrect", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/incorrect.mp3" },
  { name: "notification", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notification.mp3" },
  { name: "lesson-fail", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson-fail.mp3" },
  { name: "event-warning", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-warning.mp3" },
  { name: "move-self", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3" },
  { name: "correct", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/correct.mp3" },
  { name: "game-end", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3" },
  { name: "move-opponent", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3" },
  { name: "notify", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3" },
  { name: "event-end", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-end.mp3" },
  { name: "game-start", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3" },
  { name: "event-start", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-start.mp3" },
  { name: "lesson_pass", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson_pass.mp3" },
  { name: "promote", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3" },
  { name: "achievement", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/achievement.mp3" },
  { name: "game-lose-long", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose-long.mp3" },
  { name: "decline", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/decline.mp3" },
  { name: "draw-offer", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/draw-offer.mp3" },
  { name: "game-win-long", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-win-long.mp3" },
  { name: "puzzle-wrong", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-wrong.mp3" },
  { name: "game-draw", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-draw.mp3" },
  { name: "scatter", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/scatter.mp3" },
  { name: "game-lose", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose.mp3" },
  { name: "capture", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3" },
  { name: "castle", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3" },
  { name: "move-opponent-check", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent-check.mp3" },
  { name: "click", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/click.mp3" },
  { name: "boom", url: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/boom.mp3" }
];

// Cache the sound library for the entire server lifetime
let soundLibraryCache: { themes: Record<string, Array<{ file: string; name: string; displayName: string }>> } | null = null;

function loadSoundLibrary() {
  if (soundLibraryCache) {
    return soundLibraryCache;
  }

  console.log("[Sound Library] Loading sound files from filesystem (this will only happen once)...");
  
  const soundsDir = path.join(process.cwd(), "public", "sounds");
  const themes: Record<string, Array<{ file: string; name: string; displayName: string }>> = {};

  // Read all theme directories
  const themeDirs = fs.readdirSync(soundsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const theme of themeDirs) {
    const themePath = path.join(soundsDir, theme);
    const sounds: Array<{ file: string; name: string; displayName: string }> = [];

    // Function to recursively read sound files
    const readSoundsRecursive = (dir: string, prefix = "") => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          // Recursively read subdirectories
          readSoundsRecursive(path.join(dir, item.name), prefix ? `${prefix}/${item.name}` : item.name);
        } else if (item.name.endsWith(".mp3") || item.name.endsWith(".ogg")) {
          // Only include .mp3 files (skip .ogg duplicates and other files)
          if (item.name.endsWith(".mp3")) {
            const soundName = item.name.replace(/\.(mp3|ogg)$/, "");
            const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
            
            sounds.push({
              file: `/sounds/${theme}/${relativePath}`,
              name: soundName,
              displayName: soundName
                .replace(/([A-Z])/g, ' $1')
                .replace(/^c(\d{3})$/, 'Note $1') // Handle instrument notes
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')
                .trim()
            });
          }
        }
      }
    };

    readSoundsRecursive(themePath);
    
    if (sounds.length > 0) {
      // Sort sounds alphabetically by display name
      themes[theme] = sounds.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
  }

  // Add yoinks theme with external CDN sounds - sorted alphabetically
  themes['yoinks'] = YOINKS_SOUNDS.map(sound => ({
    file: sound.url,
    name: sound.name,
    displayName: sound.name
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  })).sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Cache the result
  soundLibraryCache = { themes };
  
  console.log(`[Sound Library] Cached ${Object.keys(themes).length} themes with ${Object.values(themes).reduce((acc, t) => acc + t.length, 0)} total sounds`);
  
  return soundLibraryCache;
}

export async function GET() {
  try {
    const soundLibrary = loadSoundLibrary();
    return NextResponse.json(soundLibrary);
  } catch (error) {
    console.error("Error reading sound files:", error);
    return NextResponse.json(
      { error: "Failed to load sound library" },
      { status: 500 }
    );
  }
}