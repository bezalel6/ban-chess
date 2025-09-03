import { NextResponse } from "next/server";
import { loadSoundLibrary } from "@/lib/sound-library-loader";

export async function GET() {
  try {
    const soundLibrary = await loadSoundLibrary();
    return NextResponse.json(soundLibrary);
  } catch (error) {
    console.error("Error reading sound files:", error);
    return NextResponse.json(
      { error: "Failed to load sound library" },
      { status: 500 }
    );
  }
}