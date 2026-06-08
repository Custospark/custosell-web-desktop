import { useEffect, useState, type ReactNode } from 'react';
import { useAppDispatch } from '../store/hooks/useApp';
import { hydrateAuth, setInitialized } from '../store/slices/authSlice';
import { loadAuthSession, migrateLegacyAuthStorage, clearAuthSession } from '../store/offline/secureStorage';
import { consumeLogoutIntent } from '../store/auth/runAppLogout';
import { queryClient } from '../api/axiosConfig';
import { accountKeys } from '../../shared/api/account/AccountQueries';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (consumeLogoutIntent()) {
          await clearAuthSession();
          if (cancelled) return;
          dispatch(setInitialized());
          return;
        }

        await migrateLegacyAuthStorage();
        const session = await loadAuthSession();
        if (cancelled) return;

        if (session) {
          dispatch(hydrateAuth(session));
          queryClient.setQueryData(accountKeys.profile(), session.user);
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
        <LoadingSpinner />
      </div>
    );
  }

  return children;
}
