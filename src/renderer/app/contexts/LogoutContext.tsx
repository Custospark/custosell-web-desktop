import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { runAppLogout } from '../store/auth/runAppLogout';

interface LogoutContextValue {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
}

const LogoutContext = createContext<LogoutContextValue | null>(null);

export function LogoutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      await runAppLogout({ navigate });
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

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    try {
      await runAppLogout();
    } finally {
      loggingOutRef.current = false;
      setIsLoggingOut(false);
    }
  }, []);

  return { logout, isLoggingOut };
}
