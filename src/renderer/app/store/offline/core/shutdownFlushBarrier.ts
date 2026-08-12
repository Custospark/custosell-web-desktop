import { flushPendingWrites, primeOfflineConnection, requestPersistentStorage } from './offlineWriteTracker';

/**
 * Shutdown durability barrier. Registers browser lifecycle handlers that drain
 * in-flight IndexedDB writes before the renderer is torn down, so offline data
 * entered by a user survives a laptop/desktop shutdown and syncs later.
 *
 * Electron wiring: the main process sends a 'offline:flush-before-quit' IPC
 * message; this module listens, flushes, and replies via window.offlineBridge
 * so app.quit() is deferred until writes are durable.
 */

declare global {
  interface Window {
    offlineBridge?: {
      onFlushRequest: (handler: () => Promise<void>) => void;
    };
  }
}

let flushed = false;

async function flush(): Promise<void> {
  primeOfflineConnection();
  await flushPendingWrites();
}

export function installShutdownFlushBarrier(): void {
  if (flushed) return;
  flushed = true;

  primeOfflineConnection();
  void requestPersistentStorage();

  const handleHide = (): void => {
    void flush();
  };

  window.addEventListener('pagehide', handleHide);
  window.addEventListener('beforeunload', handleHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flush();
    }
  });

  window.offlineBridge?.onFlushRequest(() => flush());
}

export function flushOfflineWritesNow(): Promise<void> {
  return flush();
}
