import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

export type RequestSignInOptions = {
  intent?: 'orders' | 'general';
  onSuccess?: () => void;
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
  /** Open in-shell sign-in; optional callback after success (e.g. apply pending rating). */
  requestSignIn: (opts?: RequestSignInOptions) => void;
  registerSignInOpener: (
    opener: ((opts?: RequestSignInOptions) => void) | null,
  ) => void;
};

const DiscoverShellContext = createContext<DiscoverShellContextValue | null>(null);

export function DiscoverShellProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<DiscoverHeaderState | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [onBrowse, setOnBrowse] = useState<(() => void) | null>(null);
  const [onCart, setOnCart] = useState<(() => void) | null>(null);
  const [onDiscover, setOnDiscover] = useState<(() => void) | null>(null);
  const signInOpenerRef = useRef<((opts?: RequestSignInOptions) => void) | null>(null);

  const setOnBrowseSafe = useCallback((fn: (() => void) | null) => {
    setOnBrowse(() => fn);
  }, []);
  const setOnCartSafe = useCallback((fn: (() => void) | null) => {
    setOnCart(() => fn);
  }, []);
  const setOnDiscoverSafe = useCallback((fn: (() => void) | null) => {
    setOnDiscover(() => fn);
  }, []);

  const registerSignInOpener = useCallback(
    (opener: ((opts?: RequestSignInOptions) => void) | null) => {
      signInOpenerRef.current = opener;
    },
    [],
  );

  const requestSignIn = useCallback((opts?: RequestSignInOptions) => {
    signInOpenerRef.current?.(opts);
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
      requestSignIn,
      registerSignInOpener,
    }),
    [
      header,
      cartCount,
      onBrowse,
      onCart,
      onDiscover,
      setOnBrowseSafe,
      setOnCartSafe,
      setOnDiscoverSafe,
      requestSignIn,
      registerSignInOpener,
    ],
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
