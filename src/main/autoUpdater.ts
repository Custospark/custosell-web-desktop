import { app } from 'electron';
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

export function initAutoUpdater(): void {
  if (isDev) {
    log.info('[Auto-Updater] Disabled in development mode');
    return;
  }

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyToInstall = true;
    log.info('[Auto-Updater] Update downloaded; will install on quit:', {
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
