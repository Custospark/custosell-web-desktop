import { BrowserWindow, app, Notification } from 'electron';
import log from 'electron-log';
import autoUpdaterPkg from 'electron-updater';

const { autoUpdater } = autoUpdaterPkg;

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let updateReadyToInstall = false;
let installingNow = false;
let mainWindowRef: BrowserWindow | null = null;

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  if (isDev) {
    log.info('[Auto-Updater] Disabled in development mode');
    return;
  }

  mainWindowRef = mainWindow;

  autoUpdater.on('checking-for-update', () => {
    log.info('[Auto-Updater] Checking for updates...');
    sendStatus('checking-for-update', { message: 'Checking for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[Auto-Updater] Update available:', { version: info.version });
    sendStatus('update-available', {
      message: `Downloading v${info.version} in background...`,
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('[Auto-Updater] No update available:', { version: info.version });
    sendStatus('update-not-available', {
      message: 'You are on the latest version.',
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const downloadedMB = Number((progressObj.transferred / 1024 / 1024).toFixed(2));
    const totalMB = Number((progressObj.total / 1024 / 1024).toFixed(2));
    const speedMBps = Number((progressObj.bytesPerSecond / 1024 / 1024).toFixed(2));

    sendStatus('download-progress', {
      percent,
      speedMBps,
      downloadedMB,
      totalMB,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyToInstall = true;

    log.info('[Auto-Updater] Update downloaded; will install on quit:', {
      version: info.version,
    });

    sendStatus('update-downloaded', {
      message: `Update v${info.version} is ready and will be applied when you exit the app.`,
      version: info.version,
    });

    showNativeNotification(
      'Update Ready',
      `Version ${info.version} will be installed when you exit Custosell.`,
    );
  });

  autoUpdater.on('error', (error) => {
    log.error('[Auto-Updater] Error:', { message: error.message, stack: error.stack });
    updateReadyToInstall = false;

    sendStatus('update-error', {
      message: 'Update failed. Will retry later.',
      error: error.message,
    });
  });

  setTimeout(() => {
    log.info('[Auto-Updater] Initial checkForUpdatesAndNotify()');
    void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('[Auto-Updater] Initial check failed:', err);
    });
  }, 9000);

  setInterval(() => {
    log.info('[Auto-Updater] Periodic checkForUpdatesAndNotify()');
    void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('[Auto-Updater] Periodic check failed:', err);
    });
  }, 12 * 60 * 60 * 1000);

  log.info('[Auto-Updater] Initialized');
}

export function installUpdateOnQuitIfReady(): boolean {
  if (isDev) return false;
  if (!updateReadyToInstall) return false;
  if (installingNow) return true;

  installingNow = true;

  try {
    log.info('[Auto-Updater] Running quitAndInstall() to apply update...');
    autoUpdater.quitAndInstall(true, false);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('[Auto-Updater] quitAndInstall failed:', msg);
    installingNow = false;
    updateReadyToInstall = false;
    return false;
  }
}

function sendStatus(event: string, data: Record<string, unknown>): void {
  const win = mainWindowRef;
  if (!win || win.isDestroyed()) return;
  win.webContents.send('updater-message', { event, data });
}

function showNativeNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  try {
    new Notification({ title, body, silent: false }).show();
  } catch (e) {
    log.warn('[Auto-Updater] Notification failed:', e);
  }
}
