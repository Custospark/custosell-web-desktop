import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DiscoverHeaderState = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

type ShellHandlers = {
  onBrowse: (() => void) | null;
  onCart: (() => void) | null;
  onDiscover: (() => void) | null;
};

export type DiscoverShellContextValue = {
  header: DiscoverHeaderState | null;
  cartCount: number;
  handlers: ShellHandlers;
  setHeader: (header: DiscoverHeaderState | null) => void;
  setCartCount: (count: number) => void;
  setOnBrowse: (fn: (() => void) | null) => void;
  setOnCart: (fn: (() => void) | null) => void;
  setOnDiscover: (fn: (() => void) | null) => void;
};

const DiscoverShellContext = createContext<DiscoverShellContextValue | null>(null);

export function DiscoverShellProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<DiscoverHeaderState | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [onBrowse, setOnBrowse] = useState<(() => void) | null>(null);
  const [onCart, setOnCart] = useState<(() => void) | null>(null);
  const [onDiscover, setOnDiscover] = useState<(() => void) | null>(null);

  // wrap setters so React doesn't treat function values as updater fns
  const setOnBrowseSafe = useCallback((fn: (() => void) | null) => {
    setOnBrowse(() => fn);
  }, []);
  const setOnCartSafe = useCallback((fn: (() => void) | null) => {
    setOnCart(() => fn);
  }, []);
  const setOnDiscoverSafe = useCallback((fn: (() => void) | null) => {
    setOnDiscover(() => fn);
  }, []);

  const value = useMemo<DiscoverShellContextValue>(
    () => ({
      header,
      cartCount,
      handlers: { onBrowse, onCart, onDiscover },
      setHeader,
      setCartCount,
      setOnBrowse: setOnBrowseSafe,
      setOnCart: setOnCartSafe,
      setOnDiscover: setOnDiscoverSafe,
    }),
    [header, cartCount, onBrowse, onCart, onDiscover, setOnBrowseSafe, setOnCartSafe, setOnDiscoverSafe],
  );

  return (
    <DiscoverShellContext.Provider value={value}>
      {children}
    </DiscoverShellContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook must live with provider
export function useDiscoverShell(): DiscoverShellContextValue {
  const ctx = useContext(DiscoverShellContext);
  if (!ctx) {
    throw new Error('useDiscoverShell must be used within DiscoverLayout');
  }
  return ctx;
}
