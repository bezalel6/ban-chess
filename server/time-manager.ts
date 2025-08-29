import type { TimeControl, PlayerClock } from '../lib/game-types';

export class TimeManager {
  private timeControl: TimeControl;
  private clocks: {
    white: PlayerClock;
    black: PlayerClock;
  };
  private activePlayer: 'white' | 'black' | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onTimeout: (winner: 'white' | 'black') => void;
  private onClockUpdate: (clocks: { white: PlayerClock; black: PlayerClock }) => void;

  constructor(
    timeControl: TimeControl,
    onTimeout: (winner: 'white' | 'black') => void,
    onClockUpdate: (clocks: { white: PlayerClock; black: PlayerClock }) => void
  ) {
    this.timeControl = timeControl;
    this.onTimeout = onTimeout;
    this.onClockUpdate = onClockUpdate;
    
    // Initialize clocks with starting time
    const initialTime = timeControl.initial * 1000; // Convert to milliseconds
    const now = Date.now();
    
    this.clocks = {
      white: { remaining: initialTime, lastUpdate: now },
      black: { remaining: initialTime, lastUpdate: now }
    };
  }

  start(player: 'white' | 'black') {
    // Stop any existing timer
    this.stop();
    
    this.activePlayer = player;
    this.clocks[player].lastUpdate = Date.now();
    
    // Start the timer - update every 100ms for smooth display
    this.timer = setInterval(() => {
      this.updateClock();
    }, 100);
    
    // Send initial update
    this.onClockUpdate(this.getClocks());
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Update the active player's clock one final time
    if (this.activePlayer) {
      const now = Date.now();
      const elapsed = now - this.clocks[this.activePlayer].lastUpdate;
      this.clocks[this.activePlayer].remaining -= elapsed;
      this.clocks[this.activePlayer].lastUpdate = now;
      
      // Check for timeout
      if (this.clocks[this.activePlayer].remaining <= 0) {
        this.clocks[this.activePlayer].remaining = 0;
        const winner = this.activePlayer === 'white' ? 'black' : 'white';
        this.onTimeout(winner);
      }
    }
    
    this.activePlayer = null;
  }

  switchPlayer(newPlayer: 'white' | 'black') {
    // Stop current player's clock and add increment
    if (this.activePlayer) {
      this.stop();
      
      // Add increment to the player who just moved (Fischer increment)
      if (this.activePlayer === newPlayer) {
        // This shouldn't happen in normal chess, but handle it anyway
        console.warn('Switching to same player:', newPlayer);
      } else {
        // Add increment to the player who just completed their turn
        this.clocks[this.activePlayer].remaining += this.timeControl.increment * 1000;
      }
    }
    
    // Start new player's clock
    this.start(newPlayer);
  }

  private updateClock() {
    if (!this.activePlayer) return;
    
    const now = Date.now();
    const elapsed = now - this.clocks[this.activePlayer].lastUpdate;
    this.clocks[this.activePlayer].remaining -= elapsed;
    this.clocks[this.activePlayer].lastUpdate = now;
    
    // Check for timeout
    if (this.clocks[this.activePlayer].remaining <= 0) {
      this.clocks[this.activePlayer].remaining = 0;
      this.stop();
      const winner = this.activePlayer === 'white' ? 'black' : 'white';
      this.onTimeout(winner);
      return;
    }
    
    // Send clock update to clients
    this.onClockUpdate(this.getClocks());
  }

  getClocks(): { white: PlayerClock; black: PlayerClock } {
    return {
      white: { ...this.clocks.white },
      black: { ...this.clocks.black }
    };
  }

  getActivePlayer(): 'white' | 'black' | null {
    return this.activePlayer;
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      
      // Update the clock one final time
      if (this.activePlayer) {
        const now = Date.now();
        const elapsed = now - this.clocks[this.activePlayer].lastUpdate;
        this.clocks[this.activePlayer].remaining -= elapsed;
        this.clocks[this.activePlayer].lastUpdate = now;
      }
    }
  }

  resume() {
    if (this.activePlayer && !this.timer) {
      this.clocks[this.activePlayer].lastUpdate = Date.now();
      this.timer = setInterval(() => {
        this.updateClock();
      }, 100);
    }
  }

  destroy() {
    this.stop();
  }
}