import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import type { QueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { setUser, type AuthUser } from '../../../app/store/slices/authSlice';
import { AUTH } from '../../api/endpoints/endpoints';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { staffKeys } from '../../../modules/settings/api/settings/StaffQueries';
import { mirrorHiddenApps, notifyVisibilityChanged, persistHiddenStoreApps } from './storeAppVisibility';

export function extractAuthUser(data: { data?: AuthUser } | AuthUser): AuthUser {
  if (data && typeof data === 'object' && 'data' in data && data.data) return data.data;
  return data as AuthUser;
}

/** Rejects if the save legs hang - callers always regain control. */
export async function withSaveTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Save timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export interface StoreAppsSaveInput {
  /** Workspace modules payload (owners). Omit the leg entirely to skip it. */
  modules?: string[];
  /** Full hidden set for synced visibility. Omit the leg entirely to skip it. */
  hidden?: string[];
  userId?: number | string | null;
}

export interface StoreAppsSaveResult {
  modulesSaved: boolean;
  visibilitySaved: boolean;
  user: AuthUser | null;
}

/**
 * Single shared save behind Custosell Apps "Save changes" and the onboarding
 * "Start" flow - same endpoints, same sequencing, same state convergence:
 *   PUT /auth/profile {modules} then POST /auth/store-visibility {hidden},
 *   then one authoritative GET /auth/me whose user replaces redux state, so
 *   the sidebar always resolves from server truth afterward.
 * Throws on failure - callers decide UX (store keeps the modal open,
 * onboarding proceeds with a warning and never blocks signup).
 */
export async function saveStoreApps(
  input: StoreAppsSaveInput,
  deps: { dispatch: Dispatch<UnknownAction>; queryClient: QueryClient },
): Promise<StoreAppsSaveResult> {
  const { dispatch, queryClient } = deps;
  let modulesSaved = false;
  let visibilitySaved = false;
  let fallbackUser: AuthUser | null = null;

  if (input.modules !== undefined) {
    const { data: putData } = await axiosInstance.put<{ data?: AuthUser } | AuthUser>(
      AUTH.PROFILE,
      { modules: input.modules },
    );
    fallbackUser = extractAuthUser(putData);
    modulesSaved = true;
  }

  if (input.hidden !== undefined) {
    await persistHiddenStoreApps(new Set(input.hidden));
    mirrorHiddenApps(input.userId ?? null, new Set(input.hidden));
    visibilitySaved = true;
  }

  try {
    const { data: meData } = await axiosInstance.get<{ data?: AuthUser } | AuthUser>(AUTH.ME);
    const freshUser = extractAuthUser(meData);
    dispatch(setUser(freshUser));
    try {
      await updateStoredAuthUser(freshUser);
    } catch (err) {
      console.warn('[Apps] Saved - offline backup deferred:', err);
    }
    if (modulesSaved) {
      void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
    }
    notifyVisibilityChanged();
    return { modulesSaved, visibilitySaved, user: freshUser };
  } catch (err) {
    console.warn('[Apps] Saved - profile refresh deferred:', err);
    if (fallbackUser) {
      dispatch(setUser(fallbackUser));
      if (modulesSaved) {
        void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      }
    }
    notifyVisibilityChanged();
    return { modulesSaved, visibilitySaved, user: fallbackUser };
  }
}
