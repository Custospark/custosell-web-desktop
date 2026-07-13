import type { AxiosError } from 'axios';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';

export function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: unknown };
    if (Array.isArray(body.data)) return body.data as T[];
  }
  return [];
}

export function cleanParams(params?: Record<string, string | number | undefined | null>) {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export const listDefaults = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

export function useHrErrorToast() {
  const { showToast } = useToast();
  return (err: AxiosError<{ message?: string }>, fallback: string) => {
    showToast('error', sanitizeErrorMessage(err, fallback));
  };
}
