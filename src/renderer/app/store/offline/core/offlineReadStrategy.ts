import type { AxiosError } from 'axios';
import { store } from '../../store';
import {
  isNetworkFailure,
  shouldFetchFromServer,
  shouldUseClientStorage,
} from './offlineQueryUtils';

function hasAuthToken(): boolean {
  const state = store.getState();
  return Boolean(state.auth.token || localStorage.getItem('token'));
}

function shouldFallbackToClient(err: unknown): boolean {
  if (isNetworkFailure(err)) return true;

  const status = (err as AxiosError).response?.status;
  if (status === 401 && !hasAuthToken()) {
    return true;
  }

  // Offline-first: unreachable API or local-only resources should not break the screen.
  if (status === 404) {
    return true;
  }

  return false;
}

/**
 * Online: server data takes precedence; result is backed up to React Query cache on return.
 * Offline: client cache / IndexedDB overlay only.
 * Falls back to client cache on network errors or pre-auth 401.
 */
export async function readWithOfflineStrategy<T>(options: {
  fetchFromServer: () => Promise<T>;
  readFromClient: () => Promise<T> | T;
}): Promise<T> {
  const { fetchFromServer, readFromClient } = options;

  if (shouldUseClientStorage()) {
    return readFromClient();
  }

  if (!shouldFetchFromServer()) {
    return readFromClient();
  }

  try {
    return await fetchFromServer();
  } catch (err: unknown) {
    if (shouldFallbackToClient(err)) {
      return readFromClient();
    }
    throw err;
  }
}
