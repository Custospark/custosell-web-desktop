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
    console.log('[Probe] navigator.onLine is false, returning offline');
    return { systemStatus: 'offline', isOnline: false, latency: null };
  }

  const startTime = performance.now();

  for (let i = 0; i < CONNECTIVITY_ENDPOINTS.length; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      console.log(`[Probe] Trying ${CONNECTIVITY_ENDPOINTS[i]}...`);
      await fetch(CONNECTIVITY_ENDPOINTS[i], {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const measuredLatency = Math.round(performance.now() - startTime);
      console.log(`[Probe] ${CONNECTIVITY_ENDPOINTS[i]} succeeded in ${measuredLatency}ms`);

      return {
        systemStatus: measuredLatency > SLOW_THRESHOLD_MS ? 'slow' : 'online',
        isOnline: true,
        latency: measuredLatency,
      };
    } catch (error: any) {
      console.log(`[Probe] ${CONNECTIVITY_ENDPOINTS[i]} failed:`, error?.name || error?.message || error);
    }
  }

  console.log('[Probe] All endpoints failed, returning offline');
  return { systemStatus: 'offline', isOnline: false, latency: null };
}
