#!/usr/bin/env node

/**
 * Development server runner for Windows with proper Ctrl+C handling
 * This script ensures that all child processes are properly terminated
 * when Ctrl+C is pressed on Windows systems.
 */

const { spawn } = require('child_process');
const process = require('process');

const processes = [];

// Handle Ctrl+C properly on Windows
if (process.platform === "win32") {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    process.emit("SIGINT");
  });
}

// Function to spawn a process and track it
function spawnProcess(command, args, name) {
  const proc = spawn(command, args, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  processes.push({ proc, name });
  
  proc.on('exit', (code, signal) => {
    console.log(`[${name}] Process exited with code ${code} and signal ${signal}`);
    // If one process dies, kill all others
    if (code !== 0 && code !== null) {
      console.log('One process failed, terminating all...');
      cleanup();
      process.exit(code);
    }
  });
  
  return proc;
}

// Cleanup function to kill all processes
function cleanup() {
  console.log('\nShutting down all processes...');
  processes.forEach(({ proc, name }) => {
    console.log(`Terminating ${name}...`);
    if (process.platform === 'win32') {
      // On Windows, use taskkill to ensure the process tree is killed
      spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { shell: true });
    } else {
      proc.kill('SIGTERM');
    }
  });
}

// Handle various termination signals
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C), shutting down gracefully...');
  cleanup();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});

// Start the development servers
console.log('Starting development servers...\n');
console.log('Press Ctrl+C to stop all servers\n');

// Start Next.js
spawnProcess('npm', ['run', 'dev:next'], 'NEXT');

// Give Next.js a moment to start before starting WebSocket server
setTimeout(() => {
  spawnProcess('npm', ['run', 'dev:ws'], 'WS');
}, 2000);