import { createContext } from 'react';

export interface LogoutContextValue {
  logout: (redirectTo?: string) => Promise<void>;
  isLoggingOut: boolean;
}

export const LogoutContext = createContext<LogoutContextValue | null>(null);
