import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axiosConfig';
import '../../api/axiosTypes';

const TIMEOUT_MS = 8000;
const SLOW_THRESHOLD_MS = 1000;

const CONNECTIVITY_ENDPOINTS = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
] as const;

export interface ConnectivityProbeResult {
  systemStatus: 'online' | 'slow' | 'offline';
  isOnline: boolean;
  latency: number | null;
}

/**
 * Probe API reachability via axios (Bearer + business headers attached).
 * 401/403 still means the API is up - only network/5xx counts as down.
 */
async function probeApiBackend(): Promise<{ ok: boolean; latency: number | null }> {
  const startTime = performance.now();
  try {
    await axiosInstance.get('/health', {
      timeout: TIMEOUT_MS,
      skipAuthRedirect: true,
      skipSessionUpgrade: true,
    });
    return {
      ok: true,
      latency: Math.round(performance.now() - startTime),
    };
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status && status < 500) {
      return {
        ok: true,
        latency: Math.round(performance.now() - startTime),
      };
    }
    return { ok: false, latency: null };
  }
}

async function probeExternalInternet(): Promise<{ ok: boolean; latency: number | null }> {
  const startTime = performance.now();

  for (const endpoint of CONNECTIVITY_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      await fetch(endpoint, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return {
        ok: true,
        latency: Math.round(performance.now() - startTime),
      };
    } catch {
      // try next endpoint
    }
  }

  return { ok: false, latency: null };
}

export async function probeNetworkConnectivity(): Promise<ConnectivityProbeResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { systemStatus: 'offline', isOnline: false, latency: null };
  }

  const apiProbe = await probeApiBackend();
  if (apiProbe.ok) {
    return {
      systemStatus: (apiProbe.latency ?? 0) > SLOW_THRESHOLD_MS ? 'slow' : 'online',
      isOnline: true,
      latency: apiProbe.latency,
    };
  }

  const internetProbe = await probeExternalInternet();
  if (internetProbe.ok) {
    return {
      systemStatus: (internetProbe.latency ?? 0) > SLOW_THRESHOLD_MS ? 'slow' : 'online',
      isOnline: true,
      latency: internetProbe.latency,
    };
  }

  return { systemStatus: 'offline', isOnline: false, latency: null };
}
