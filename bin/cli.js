#!/usr/bin/env node

/**
 * openwork CLI launcher
 * 
 * This script launches the openwork Electron app.
 * When installed via npm, it will start the packaged app.
 * During development, it runs electron-vite dev.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || 
  fs.existsSync(path.join(__dirname, '..', 'electron.vite.config.ts'));

if (isDev) {
  // Development mode - run electron-vite dev
  const child = spawn('npx', ['electron-vite', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // Production mode - launch the packaged app
  const platform = process.platform;
  let appPath;

  if (platform === 'darwin') {
    appPath = path.join(__dirname, '..', 'release', 'mac', 'openwork.app', 'Contents', 'MacOS', 'openwork');
  } else if (platform === 'win32') {
    appPath = path.join(__dirname, '..', 'release', 'win-unpacked', 'openwork.exe');
  } else {
    appPath = path.join(__dirname, '..', 'release', 'linux-unpacked', 'openwork');
  }

  if (fs.existsSync(appPath)) {
    const child = spawn(appPath, process.argv.slice(2), {
      stdio: 'inherit',
      detached: true
    });
    child.unref();
  } else {
    console.error('openwork app not found. Please run: npm run package');
    process.exit(1);
  }
}
