import { NextResponse } from 'next/server';
import { getGlobalSettings } from '@/lib/admin';

// Public endpoint to get global settings for default values
export async function GET() {
  try {
    const settings = await getGlobalSettings();
    
    // Return sound settings with eventSoundMap for customization
    return NextResponse.json({
      soundEnabled: settings.soundEnabled,
      soundVolume: settings.soundVolume,
      eventSoundMap: settings.eventSoundMap || {}
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    // Return defaults if error
    return NextResponse.json({
      soundEnabled: true,
      soundVolume: 0.5,
      eventSoundMap: {}
    });
  }
}