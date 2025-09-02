import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
      themes[theme] = sounds.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
  }

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