import { useEffect, useState } from 'react';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { AUTH } from '../../api/endpoints/endpoints';

/**
 * Custosell Apps visibility for hideable apps.
 *
 * - Business owners toggle workspace apps through the existing modules API
 *   (same as Settings > Custosell Apps).
 * - Everything else lives here: default apps (Account, Custosell Guide,
 *   Online Shopping) for every account type, plus workspace apps for personal
 *   accounts (whose modules resolve from plan features, not stored grants).
 *
 * Source of truth is `user.preferences.hidden_store_apps` (synced across
 * devices). localStorage mirrors it per user so hiding still works offline.
 * Hiding is visibility-only: backend plan/module resolution is untouched and
 * hidden apps stay open by direct link.
 */

export const TOGGLEABLE_DEFAULT_APPS = ['account', 'guide', 'discover'] as const;

export type ToggleableDefaultApp = (typeof TOGGLEABLE_DEFAULT_APPS)[number];

/** Default apps shown in the Custosell Apps "Everyday" section (and onboarding picker). */
export const EVERYDAY_SLUGS: ToggleableDefaultApp[] = ['discover', 'account', 'guide'];

export const HIDDEN_PREFS_KEY = 'hidden_store_apps';

interface VisibilityUser {
  id?: number | string | null;
  preferences?: Record<string, unknown> | null;
}

const STORAGE_PREFIX = 'custosell:hidden-store-apps:';

const VISIBILITY_EVENT = 'custosell:store-visibility';

function storageKey(userId: number | string | null | undefined): string {
  return `${STORAGE_PREFIX}${userId ?? 'anon'}`;
}

function sanitize(slugs: unknown): Set<string> {
  if (!Array.isArray(slugs)) return new Set();
  return new Set(
    slugs.filter(
      (slug): slug is string =>
        typeof slug === 'string' && slug.length > 0 && slug.length <= 64,
    ),
  );
}

function readMirror(userId: number | string | null | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    return sanitize(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeMirror(userId: number | string | null | undefined, hidden: Set<string>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...hidden]));
  } catch {
    /* private-mode storage - visibility just won't persist offline */
  }
}

function serverHidden(user: VisibilityUser | null | undefined): Set<string> | null {
  const prefs = user?.preferences;
  if (!prefs || !(HIDDEN_PREFS_KEY in prefs)) return null;
  return sanitize(prefs[HIDDEN_PREFS_KEY]);
}

/** Server value wins when present (syncs across devices); otherwise the offline mirror. */
export function getHiddenStoreApps(user: VisibilityUser | null | undefined): Set<string> {
  const server = serverHidden(user);
  if (server) {
    writeMirror(user?.id, server);
    return server;
  }
  return readMirror(user?.id);
}

export function isStoreAppHidden(user: VisibilityUser | null | undefined, slug: string): boolean {
  return getHiddenStoreApps(user).has(slug);
}

export function setStoreAppHidden(
  user: VisibilityUser | null | undefined,
  slug: string,
  hidden: boolean,
): Set<string> {
  const next = getHiddenStoreApps(user);
  if (hidden) {
    next.add(slug);
  } else {
    next.delete(slug);
  }
  writeMirror(user?.id, next);
  window.dispatchEvent(new CustomEvent(VISIBILITY_EVENT));
  return next;
}

/** Push the hidden set to the server so other devices pick it up. */
export async function persistHiddenStoreApps(hidden: Set<string>): Promise<void> {
  await axiosInstance.post(AUTH.STORE_VISIBILITY, { hidden: [...hidden] });
}

/** Overwrite the offline mirror (used after a successful server save). */
export function mirrorHiddenApps(
  userId: number | string | null | undefined,
  hidden: Set<string>,
): void {
  writeMirror(userId, hidden);
}

/** Tell sidebar, search, grids and launchers to re-read visibility. */
export function notifyVisibilityChanged(): void {
  window.dispatchEvent(new CustomEvent(VISIBILITY_EVENT));
}

/** Re-render counter that bumps whenever any store-app visibility changes. */
export function useStoreVisibilityVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(VISIBILITY_EVENT, bump);
    return () => window.removeEventListener(VISIBILITY_EVENT, bump);
  }, []);
  return version;
}
