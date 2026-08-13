import { app, BrowserWindow, Menu, ipcMain, safeStorage, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initAutoUpdater, installUpdateOnQuitIfReady, restartAndInstallNow, getPendingUpdateVersion } from './autoUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

let mainWindow: BrowserWindow | null = null;
let paymentWindow: BrowserWindow | null = null;
let quitFlushComplete = false;

/** Lightweight, responsive loading page shown while the gateway URL resolves. */
const PAYMENT_LOADING_HTML = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Custosell Payment</title>
    <style>
      html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;
        background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#334155;}
      .box{text-align:center;padding:24px;}
      .spin{width:clamp(44px,10vw,64px);height:clamp(44px,10vw,64px);border:5px solid #c7d2fe;
        border-top-color:#4f46e5;border-radius:50%;animation:s 0.8s linear infinite;
        margin:0 auto clamp(16px,3vw,20px);}
      @keyframes s{to{transform:rotate(360deg)}}
      p{font-size:clamp(16px,4.5vw,22px);font-weight:600;margin:0;line-height:1.4;color:#1e293b}
    </style>
  </head>
  <body>
    <div class="box"><div class="spin"></div><p>Connecting to secure payment…</p></div>
  </body>
</html>`;

function getPaymentLoadingUrl(): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(PAYMENT_LOADING_HTML)}`;
}

/** Open (or reuse) the payment gateway window. A true modal child owned by the
 *  main process so closing it can never blank or hijack the main window. */
function openPaymentWindow(): BrowserWindow | null {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  if (paymentWindow && !paymentWindow.isDestroyed()) {
    paymentWindow.show();
    paymentWindow.focus();
    return paymentWindow;
  }

  paymentWindow = new BrowserWindow({
    width: 600,
    height: 760,
    parent: mainWindow,
    modal: true,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  paymentWindow.once('ready-to-show', () => {
    paymentWindow?.show();
    paymentWindow?.focus();
  });

  paymentWindow.on('closed', () => {
    paymentWindow = null;
  });

  void paymentWindow.loadURL(getPaymentLoadingUrl());
  return paymentWindow;
}

function navigatePaymentWindow(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  const win = openPaymentWindow();
  if (!win) return false;
  void win.loadURL(url);
  return true;
}

function closePaymentWindow(): void {
  if (paymentWindow && !paymentWindow.isDestroyed()) {
    paymentWindow.close();
  }
  paymentWindow = null;
}

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

  // Window-open policy:
  // - The payment gateway is opened as a main-process-owned modal child window
  //   via IPC (payment-window:open / navigate / close) — never window.open, so
  //   no blank child window can cover the app.
  // - Any other external http(s) URL (PDFs, social links, etc.) is opened in the
  //   user's default browser via shell.openExternal.
  // - Everything else is denied.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    initAutoUpdater();
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

ipcMain.handle('app-update:pending-version', () => getPendingUpdateVersion());

ipcMain.handle('app-update:restart-and-install', () => restartAndInstallNow());

ipcMain.handle('shell:open-external', (_event, url: unknown) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  void shell.openExternal(url);
  return true;
});

ipcMain.handle('payment-window:open', () => {
  return !!openPaymentWindow();
});

ipcMain.handle('payment-window:navigate', (_event, url: unknown) => {
  if (typeof url !== 'string') return false;
  return navigatePaymentWindow(url);
});

ipcMain.handle('payment-window:close', () => {
  closePaymentWindow();
  return true;
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
    return;
  }

  // Defer quit until the renderer has flushed in-flight IndexedDB writes so
  // offline data survives shutdown. Timeout guards against a hung renderer.
  if (mainWindow && !mainWindow.isDestroyed() && !quitFlushComplete) {
    event.preventDefault();
    quitFlushComplete = true;
    let done = false;
    mainWindow.webContents.send('offline:flush-before-quit');
    const finish = () => {
      if (done) return;
      done = true;
      app.quit();
    };
    ipcMain.on('offline:flush-before-quit-done', finish);
    setTimeout(finish, 5000);
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
