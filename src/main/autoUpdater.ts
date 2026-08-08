import { app, BrowserWindow } from 'electron';
import log from 'electron-log';
import autoUpdaterPkg from 'electron-updater';

const { autoUpdater } = autoUpdaterPkg;

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let updateReadyToInstall = false;
let pendingUpdateVersion: string | null = null;
let installingNow = false;

function notifyUpdateReady(info: { version: string }): void {
  const payload = { version: info.version };
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('app-update:ready', payload);
    }
  }
}

export function initAutoUpdater(): void {
  if (isDev) {
    log.info('[Auto-Updater] Disabled in development mode');
    return;
  }

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyToInstall = true;
    pendingUpdateVersion = info.version;
    notifyUpdateReady(info);
    log.info('[Auto-Updater] Update downloaded; ready to install on restart:', {
      version: info.version,
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
  }, CHECK_INTERVAL_MS);

  log.info('[Auto-Updater] Initialized');
}

export function getPendingUpdateVersion(): string | null {
  return pendingUpdateVersion;
}

export function restartAndInstallNow(): boolean {
  if (isDev) return false;
  if (!updateReadyToInstall) return false;
  if (installingNow) return true;

  installingNow = true;

  try {
    log.info('[Auto-Updater] User triggered restart & install...');
    autoUpdater.quitAndInstall(true, true);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('[Auto-Updater] quitAndInstall failed:', msg);
    installingNow = false;
    return false;
  }
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
