#!/usr/bin/env node

/**
 * Development server with robust cleanup and process management
 * Ensures all child processes are properly terminated on shutdown
 */

const { spawn } = require('child_process');
const { platform } = require('os');

const isWindows = platform() === 'win32';

// Track all child processes
const childProcesses = new Set();

// Colors for console output
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

function log(prefix, color, message) {
  console.log(`${color}[${prefix}]${RESET} ${message}`);
}

// Function to kill a process tree (including all child processes)
function killProcessTree(pid, signal = 'SIGTERM') {
  if (isWindows) {
    try {
      // On Windows, use taskkill to kill the process tree
      const taskkill = spawn('taskkill', ['/pid', pid, '/T', '/F'], { 
        stdio: 'ignore',
        detached: false 
      });
      taskkill.on('error', () => {
        // Silently ignore errors (process might already be dead)
      });
    } catch {
      // Ignore errors - process might already be dead
    }
  } else {
    try {
      // On Unix, kill the process group
      process.kill(-pid, signal);
    } catch {
      // Try killing just the process if group kill fails
      try {
        process.kill(pid, signal);
      } catch {
        // Process already dead
      }
    }
  }
}

// Start a server with proper process management
function startServer(name, command, args, color, port) {
  log(name, color, `Starting on port ${port}...`);
  
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
    detached: !isWindows, // Create new process group on Unix
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      NODE_ENV: 'development'
    }
  });

  childProcesses.add(child);

  // Handle stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      // Skip repetitive Redis cleanup messages
      if (line.includes('[Redis] Running cleanup task...')) return;
      console.log(`${color}[${name}]${RESET} ${line}`);
    });
  });

  // Handle stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      // Filter out non-critical warnings
      if (line.includes('DeprecationWarning')) return;
      if (line.includes('ExperimentalWarning')) return;
      console.error(`${RED}[${name}]${RESET} ${line}`);
    });
  });

  // Handle process exit
  child.on('exit', (code, signal) => {
    childProcesses.delete(child);
    if (signal) {
      log(name, YELLOW, `Process terminated by signal ${signal}`);
    } else if (code !== 0 && code !== null) {
      log(name, RED, `Process exited with code ${code}`);
    } else {
      log(name, GREEN, `Process exited cleanly`);
    }
  });

  child.on('error', (err) => {
    log(name, RED, `Failed to start: ${err.message}`);
    childProcesses.delete(child);
  });

  return child;
}

// Graceful shutdown function
async function shutdown(signal) {
  console.log(`\n${YELLOW}[MAIN]${RESET} Received ${signal}, shutting down gracefully...`);
  
  let shutdownTimeout;
  
  // Set a hard timeout for shutdown
  shutdownTimeout = setTimeout(() => {
    console.log(`${RED}[MAIN]${RESET} Shutdown timeout exceeded, forcing exit...`);
    process.exit(1);
  }, 10000); // 10 second timeout

  // Kill all child processes
  const killPromises = Array.from(childProcesses).map(child => {
    return new Promise((resolve) => {
      if (!child.killed) {
        child.on('exit', resolve);
        
        // Send SIGTERM first
        if (isWindows) {
          killProcessTree(child.pid);
        } else {
          try {
            // Kill the process group on Unix
            process.kill(-child.pid, 'SIGTERM');
          } catch {
            // Fallback to killing just the process
            child.kill('SIGTERM');
          }
        }
        
        // Force kill after 5 seconds if still alive
        setTimeout(() => {
          if (!child.killed) {
            log('MAIN', RED, `Force killing process ${child.pid}`);
            if (isWindows) {
              killProcessTree(child.pid);
            } else {
              try {
                process.kill(-child.pid, 'SIGKILL');
              } catch {
                child.kill('SIGKILL');
              }
            }
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  });

  try {
    await Promise.all(killPromises);
    console.log(`${GREEN}[MAIN]${RESET} All processes terminated`);
  } catch (err) {
    console.error(`${RED}[MAIN]${RESET} Error during shutdown:`, err);
  }

  clearTimeout(shutdownTimeout);
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error(`${RED}[MAIN]${RESET} Uncaught exception:`, err);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${RED}[MAIN]${RESET} Unhandled rejection at:`, promise, 'reason:', reason);
});

// Main execution
async function main() {
  console.log(`${GREEN}[MAIN]${RESET} Starting development servers...`);
  console.log(`${GREEN}[MAIN]${RESET} Press Ctrl+C to stop all servers\n`);

  // Start WebSocket server first
  startServer(
    'WS',
    'tsx',
    ['server/ws-server.ts'],
    MAGENTA,
    3001
  );

  // Wait a bit for WebSocket server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start Next.js dev server
  startServer(
    'NEXT',
    'npx',
    ['next', 'dev'],
    CYAN,
    3000
  );

  // Keep the main process alive
  process.stdin.resume();
}

// Start the servers
main().catch(err => {
  console.error(`${RED}[MAIN]${RESET} Fatal error:`, err);
  process.exit(1);
});