import { useEffect, useState, type ReactNode } from 'react';
import { useAppDispatch } from '../store/hooks/useApp';
import { hydrateAuth, setInitialized } from '../store/slices/authSlice';
import {
  loadAuthSession,
  migrateLegacyAuthStorage,
  clearAuthSession,
  normalizeStoredSession,
} from '../store/offline/auth/secureStorage';
import { consumeLogoutIntent } from '../store/auth/runAppLogout';
import { queryClient } from '../api/axiosConfig';
import { accountKeys } from '../../shared/api/account/AccountQueries';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { isOfflineMode } from '../store/offline/core/offlineQueryUtils';
import { upgradeLocalSessionIfOnline } from '../store/offline/auth/sessionUpgrade';
import { getStoredPlans } from '../../shared/utils/planStorage';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const hadLogoutIntent = consumeLogoutIntent();

        await migrateLegacyAuthStorage();
        const session = await loadAuthSession();
        if (cancelled) return;

        // 401 hard-redirect: skip hydrate only when session was actually cleared.
        // Ignore stale intent after SPA logout + re-login (session exists again).
        if (hadLogoutIntent && !session) {
          await clearAuthSession();
          dispatch(setInitialized());
          return;
        }

        if (session) {
          const normalized = await normalizeStoredSession(session);
          if (cancelled) return;
          if (!normalized.plans?.length) {
            const fallbackPlans = getStoredPlans();
            if (fallbackPlans.length) normalized.plans = fallbackPlans;
          }
          dispatch(hydrateAuth(normalized));
          queryClient.setQueryData(accountKeys.profile(), normalized.user);

          if (normalized.isLocalSession && !normalized.pendingAuthSync && !isOfflineMode()) {
            void upgradeLocalSessionIfOnline();
          }
        } else {
          dispatch(setInitialized());
        }
      } catch {
        if (!cancelled) dispatch(setInitialized());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <CustosellLoader />
      </div>
    );
  }

  return children;
}
