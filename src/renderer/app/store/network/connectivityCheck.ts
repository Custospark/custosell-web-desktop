const TIMEOUT_MS = 10000;
const SLOW_THRESHOLD_MS = 1000;

const CONNECTIVITY_ENDPOINTS = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
  'https://www.github.com/favicon.ico',
] as const;

export interface ConnectivityProbeResult {
  systemStatus: 'online' | 'slow' | 'offline';
  isOnline: boolean;
  latency: number | null;
}

export async function probeNetworkConnectivity(): Promise<ConnectivityProbeResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { systemStatus: 'offline', isOnline: false, latency: null };
  }

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(CONNECTIVITY_ENDPOINTS[0], {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const measuredLatency = Math.round(performance.now() - startTime);

    return {
      systemStatus: measuredLatency > SLOW_THRESHOLD_MS ? 'slow' : 'online',
      isOnline: true,
      latency: measuredLatency,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { systemStatus: 'slow', isOnline: true, latency: TIMEOUT_MS };
    }

    for (let i = 1; i < CONNECTIVITY_ENDPOINTS.length; i++) {
      try {
        const backupController = new AbortController();
        const backupTimeoutId = setTimeout(() => backupController.abort(), TIMEOUT_MS);

        await fetch(CONNECTIVITY_ENDPOINTS[i], {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: backupController.signal,
        });

        clearTimeout(backupTimeoutId);

        const measuredLatency = Math.round(performance.now() - startTime);

        return {
          systemStatus: measuredLatency > SLOW_THRESHOLD_MS ? 'slow' : 'online',
          isOnline: true,
          latency: measuredLatency,
        };
      } catch {
        continue;
      }
    }

    return { systemStatus: 'offline', isOnline: false, latency: null };
  }
}
