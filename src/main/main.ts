import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function getProdIndexPath(): string {
  return path.join(app.getAppPath(), 'dist', 'web', 'index.html');
}

function createWindow(): BrowserWindow {
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
