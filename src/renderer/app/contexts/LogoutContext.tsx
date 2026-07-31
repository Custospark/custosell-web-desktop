import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { runAppLogout } from '../store/auth/runAppLogout';
import { LogoutContext } from './logoutContext';

export function LogoutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);

  const logout = useCallback(async (redirectTo?: string) => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      await runAppLogout({ navigate, redirectTo });
    } catch (err) {
      console.error('[Auth] Logout failed:', err);
    } finally {
      loggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  }, [navigate]);

  return (
    <LogoutContext.Provider value={{ logout, isLoggingOut }}>
      {children}
    </LogoutContext.Provider>
  );
}
