import { app, BrowserWindow, Menu, ipcMain, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initAutoUpdater, installUpdateOnQuitIfReady } from './autoUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function getSecureStorePath(): string {
  return path.join(app.getPath('userData'), 'secure-store.json');
}

function readSecureStoreFile(): Record<string, string> {
  const filePath = getSecureStorePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeSecureStoreFile(data: Record<string, string>): void {
  fs.writeFileSync(getSecureStorePath(), JSON.stringify(data), 'utf8');
}

function getProdIndexPath(): string {
  return path.join(app.getAppPath(), 'dist', 'web', 'index.html');
}

function createWindow(): BrowserWindow {
  const iconPath = isDev
    ? path.join(__dirname, '..', '..', '..', 'assets', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    fullscreenable: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: isDev
        ? path.join(__dirname, '..', 'preload', 'preload.js')
        : path.join(app.getAppPath(), 'preload.js'),
      webSecurity: !isDev,
      devTools: isDev,
    },
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    const devServerUrl = 'http://localhost:5173';
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = getProdIndexPath();
    mainWindow.loadFile(indexPath).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to load production index.html:', message);

      void mainWindow?.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial;padding:40px;text-align:center;background:#f5f5f5;">
            <h1 style="color:#333;">Application Error</h1>
            <p style="color:#666;">Failed to load application files.</p>
            <pre style="white-space:pre-wrap;color:#999;font-size:12px;max-width:900px;margin:20px auto;">${message}</pre>
          </body>
        </html>
      `);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    initAutoUpdater(mainWindow);
  }

  return mainWindow;
}

ipcMain.handle('toggle-fullscreen', () => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  return mainWindow.isFullScreen();
});

ipcMain.handle('is-fullscreen', () => mainWindow?.isFullScreen() ?? false);

ipcMain.on('toggle-devtools', () => {
  if (!isDev || !mainWindow) return;
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
  } else {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
});

ipcMain.on('open-devtools', () => {
  if (!isDev || !mainWindow) return;
  mainWindow.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.on('close-devtools', () => {
  if (!isDev || !mainWindow) return;
  mainWindow.webContents.closeDevTools();
});

ipcMain.handle('is-devtools-open', () => {
  if (!isDev || !mainWindow) return false;
  return mainWindow.webContents.isDevToolsOpened();
});

ipcMain.handle('secure-store:set', (_event, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) return false;
  const encrypted = safeStorage.encryptString(value).toString('base64');
  const store = readSecureStoreFile();
  store[key] = encrypted;
  writeSecureStoreFile(store);
  return true;
});

ipcMain.handle('secure-store:get', (_event, key: string) => {
  if (!safeStorage.isEncryptionAvailable()) return null;
  const store = readSecureStoreFile();
  const encrypted = store[key];
  if (!encrypted) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch {
    return null;
  }
});

ipcMain.handle('secure-store:delete', (_event, key: string) => {
  const store = readSecureStoreFile();
  delete store[key];
  writeSecureStoreFile(store);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (isDev) return;

  const willInstall = installUpdateOnQuitIfReady();
  if (willInstall) {
    event.preventDefault();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
});

export { createWindow };
