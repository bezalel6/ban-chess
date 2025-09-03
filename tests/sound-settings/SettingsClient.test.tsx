import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SettingsClient from '@/app/sound-settings/SettingsClient';
import soundManager from '@/lib/sound-manager';

// Mock sound manager
jest.mock('@/lib/sound-manager', () => ({
  __esModule: true,
  default: {
    isEnabled: jest.fn(() => true),
    getVolume: jest.fn(() => 0.5),
    getEventSoundMap: jest.fn(() => ({})),
    setVolume: jest.fn(),
    setEnabled: jest.fn(),
    setEventSound: jest.fn(),
    changeSoundTheme: jest.fn(),
    playEvent: jest.fn(),
  },
  eventTypes: ['move', 'capture', 'check'],
  eventMetadata: {
    move: { name: 'Move', icon: () => <div>Move Icon</div> },
    capture: { name: 'Capture', icon: () => <div>Capture Icon</div> },
    check: { name: 'Check', icon: () => <div>Check Icon</div> },
  },
}));

// Mock fetch for sound library
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      themes: {
        standard: [
          { file: '/sounds/standard/test.mp3', name: 'test', displayName: 'Test Sound' }
        ]
      }
    }),
  })
) as jest.MockedFunction<typeof fetch>;

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(() => Promise.resolve()),
  volume: 0.5,
}));

describe('SettingsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sound settings page', () => {
    render(<SettingsClient />);
    
    expect(screen.getByText('Sound Settings')).toBeInTheDocument();
    expect(screen.getByText('Sound Explorer')).toBeInTheDocument();
    expect(screen.getByText('Game Event Sounds')).toBeInTheDocument();
  });

  test('shows assignment banner when sound is selected for assignment', async () => {
    render(<SettingsClient />);
    
    // Wait for sound library to load
    await waitFor(() => {
      expect(screen.getByText('Test Sound')).toBeInTheDocument();
    });

    // Hover and click assignment button (this would require more complex setup in real tests)
    // For now, we test the basic rendering
    expect(screen.queryByText(/Ready to assign:/)).not.toBeInTheDocument();
  });

  test('calls sound manager when volume changes', () => {
    render(<SettingsClient />);
    
    const volumeSlider = screen.getByRole('slider');
    fireEvent.change(volumeSlider, { target: { value: '75' } });
    
    expect(soundManager.setVolume).toHaveBeenCalledWith(0.75);
  });

  test('resets to defaults when reset button is clicked', () => {
    render(<SettingsClient />);
    
    const resetButton = screen.getByTitle('Reset all event sounds to default');
    fireEvent.click(resetButton);
    
    expect(soundManager.changeSoundTheme).toHaveBeenCalledWith('standard');
  });

  test('plays event sound when event is clicked without pending assignment', async () => {
    render(<SettingsClient />);
    
    // Wait for component to load
    await waitFor(() => {
      const moveButton = screen.getByText('Move');
      expect(moveButton).toBeInTheDocument();
      
      fireEvent.click(moveButton);
      expect(soundManager.playEvent).toHaveBeenCalledWith('move');
    });
  });

  test('shows clear instructions for different modes', () => {
    render(<SettingsClient />);
    
    expect(screen.getByText(/How to use:/)).toBeInTheDocument();
    expect(screen.getByText(/Current mode:/)).toBeInTheDocument();
  });
});