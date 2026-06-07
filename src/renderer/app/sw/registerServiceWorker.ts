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

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
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
