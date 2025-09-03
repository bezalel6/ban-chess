'use client';

import { useState, useEffect } from 'react';
import { SOUND_THEMES } from '@/lib/sounds';

interface GlobalSettings {
  soundTheme: string;
  soundVolume: number;
  moveSound: boolean;
  captureSound: boolean;
  checkSound: boolean;
  castleSound: boolean;
  gameEndSound: boolean;
}

export default function AdminSettingsClient() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/global-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        setMessage('Failed to load settings');
      }
    } catch {
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-500">Failed to load settings</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Global Sound Settings</h2>
      
      <div className="space-y-4">
        {/* Sound Theme */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Default Sound Theme
          </label>
          <select
            value={settings.soundTheme}
            onChange={(e) => setSettings({ ...settings, soundTheme: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(SOUND_THEMES).map((theme) => (
              <option key={theme} value={theme}>
                {SOUND_THEMES[theme].name}
              </option>
            ))}
          </select>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Default Volume: {Math.round(settings.soundVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.soundVolume * 100}
            onChange={(e) => setSettings({ ...settings, soundVolume: parseInt(e.target.value) / 100 })}
            className="w-full"
          />
        </div>

        {/* Sound toggles */}
        <div className="space-y-2">
          <h3 className="font-medium">Default Sound Effects</h3>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.moveSound}
              onChange={(e) => setSettings({ ...settings, moveSound: e.target.checked })}
              className="rounded"
            />
            <span>Move sounds</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.captureSound}
              onChange={(e) => setSettings({ ...settings, captureSound: e.target.checked })}
              className="rounded"
            />
            <span>Capture sounds</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.checkSound}
              onChange={(e) => setSettings({ ...settings, checkSound: e.target.checked })}
              className="rounded"
            />
            <span>Check sounds</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.castleSound}
              onChange={(e) => setSettings({ ...settings, castleSound: e.target.checked })}
              className="rounded"
            />
            <span>Castle sounds</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.gameEndSound}
              onChange={(e) => setSettings({ ...settings, gameEndSound: e.target.checked })}
              className="rounded"
            />
            <span>Game end sounds</span>
          </label>
        </div>
      </div>

      {/* Save button and message */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-md font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        
        {message && (
          <div className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </div>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-gray-700 rounded-md">
        <p className="text-sm text-gray-300">
          These settings will be used as defaults for all new users and guests. 
          Existing users can override these in their personal settings.
        </p>
      </div>
    </div>
  );
}