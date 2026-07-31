import { useCallback, useContext, useRef, useState } from 'react';
import { runAppLogout } from '../store/auth/runAppLogout';
import { LogoutContext, type LogoutContextValue } from './logoutContext';

export function useLogoutAction(): LogoutContextValue {
  const ctx = useContext(LogoutContext);
  if (!ctx) {
    throw new Error('useLogoutAction must be used within LogoutProvider');
  }
  return ctx;
}

/** For components outside LogoutProvider */
export function useLogoutFallback(): LogoutContextValue {
  const loggingOutRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async (redirectTo?: string) => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    try {
      await runAppLogout({ redirectTo });
    } finally {
      loggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  }, []);

  return { logout, isLoggingOut };
}
