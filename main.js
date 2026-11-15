// Stremio Web Shell — Electron wrapper around the Stremio web client and server.
// Copyright (C) 2026 SKBlacksmith
// SPDX-License-Identifier: GPL-2.0-only

'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const UI_PORT = 11469;
const SERVER_PORT = 11470;
const UI_HOST = '127.0.0.1';

const RESOURCE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'stremio-web-shell')
  : __dirname;

const WEB_ROOT = path.join(RESOURCE_DIR, 'web');
const MANIFEST_FILE = path.join(RESOURCE_DIR, 'server-version.json');
const CACHE_DIR = path.join(app.getPath('cache'), 'stremio-web-shell');
const SERVER_JS = path.join(CACHE_DIR, 'server.js');

let serverProcess = null;
let uiServer = null;
let mainWindow = null;

function log(...args) {
  console.log('[stremio-web-shell]', ...args);
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination + '.part');
    const request = (target, redirects = 0) => {
      https
        .get(target, { headers: { 'User-Agent': 'stremio-web-shell' } }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            if (redirects > 5) {
              reject(new Error('too many redirects'));
              return;
            }
            response.resume();
            request(new URL(response.headers.location, target).toString(), redirects + 1);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`download failed: HTTP ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
        })
        .on('error', reject);
    };
    request(url);
  });
}

// The server bundle is proprietary and is not redistributed with this package:
// it is fetched from Stremio on first run and re-fetched whenever the packaged
// manifest points at a different version.
async function ensureServer() {
  const manifest = readManifest();
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (fs.existsSync(SERVER_JS) && sha256File(SERVER_JS) === manifest.sha256) {
    log('server.js up to date:', manifest.version);
    return SERVER_JS;
  }

  log('fetching server.js', manifest.version);
  const target = SERVER_JS + '.part';
  await download(manifest.url, target);
  const actual = sha256File(target);
  if (actual !== manifest.sha256) {
    fs.rmSync(target, { force: true });
    throw new Error(`server.js checksum mismatch: ${actual} != ${manifest.sha256}`);
  }
  fs.renameSync(target, SERVER_JS);
  fs.writeFileSync(
    path.join(CACHE_DIR, 'server-version'),
    manifest.version + '\n',
    'utf8'
  );
  return SERVER_JS;
}

function startUiServer() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm',
  };

  uiServer = http.createServer((request, response) => {
    const requested = decodeURIComponent((request.url || '/').split('?')[0]);
    let filePath = path.join(WEB_ROOT, requested === '/' ? 'index.html' : requested);
    if (!filePath.startsWith(WEB_ROOT)) {
      response.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(WEB_ROOT, 'index.html');
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    uiServer.once('error', reject);
    uiServer.listen(UI_PORT, UI_HOST, resolve);
  });
}

function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(
        { host: UI_HOST, port: SERVER_PORT, path: '/', timeout: 2000 },
        (response) => {
          response.resume();
          resolve();
        }
      );
      request.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('streaming server did not start'));
          return;
        }
        setTimeout(attempt, 400);
      });
      request.on('timeout', () => request.destroy());
    };
    attempt();
  });
}

function startServer(serverJs) {
  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: CACHE_DIR,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      APP_PATH: app.getPath('userData'),
      FFMPEG_BIN: '/usr/bin/ffmpeg',
      FFPROBE_BIN: '/usr/bin/ffprobe',
      NO_CORS: '1',
      CASTING_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => process.stdout.write(`[server] ${data}`));
  serverProcess.stderr.on('data', (data) => process.stderr.write(`[server] ${data}`));
  serverProcess.on('exit', (code) => log('streaming server exited with code', code));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#0b0b0b',
    autoHideMenuBar: true,
    title: 'Stremio',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://${UI_HOST}:${UI_PORT}/`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function boot() {
  try {
    await startUiServer();
    const serverJs = await ensureServer();
    startServer(serverJs);
    await waitForServer();
    createWindow();
  } catch (error) {
    log('startup failed:', error.message);
    dialog.showErrorBox('Stremio Web Shell', error.message);
    app.quit();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(boot);

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('quit', () => {
    if (serverProcess) serverProcess.kill('SIGTERM');
    if (uiServer) uiServer.close();
  });
}
