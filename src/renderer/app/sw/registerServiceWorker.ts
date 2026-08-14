const isElectron =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

/** SW enabled in production and Vite dev (for offline testing). Skipped in Electron. */
const enableServiceWorker = !isElectron;

export function clearServiceWorkerApiCache(): void {
  if (!('serviceWorker' in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  controller?.postMessage({ type: 'CLEAR_API_CACHE' });
}

export function registerServiceWorker(): void {
  if (isElectron) return;
  if (!enableServiceWorker) return;
  if (!('serviceWorker' in navigator)) return;

  const forceUpdate = (registration: ServiceWorkerRegistration) => {
    // Browsers can delay SW updates for hours. Force a check on load and on
    // visibility change so a new sw.js (with a fresh CACHE_VERSION) is picked
    // up immediately and stale chunks are purged on the next activate.
    void registration.update();
  };

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then((registration) => {
        forceUpdate(registration);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            forceUpdate(registration);
          }
        });

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
