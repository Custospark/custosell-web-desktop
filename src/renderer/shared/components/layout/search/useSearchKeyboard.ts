import { useCallback, useSyncExternalStore } from 'react';

// ─── Module-level singleton ───────────────────────────────────────────────────
//
// A module-level boolean + a Set of subscriber callbacks. This means:
//  • The ⌘K / Ctrl+K listener is registered ONCE, at module load time.
//  • It survives component unmounts (the Navbar trigger may not always be mounted).
//  • Every hook instance shares the same open/close state - so clicking the
//    search trigger and pressing ⌘K always talk to the same palette.
//
// ─────────────────────────────────────────────────────────────────────────────
let globalIsOpen = false;
const subscribers = new Set<(open: boolean) => void>();

/** Central mutator - updates the singleton and notifies every subscriber. */
function setGlobal(open: boolean): void {
  globalIsOpen = open;
  subscribers.forEach((fn) => fn(open));
}

// Register the ⌘K / Ctrl+K listener exactly once when the module is first
// imported (SSR-safe guard via typeof window check).
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); // stop browser-level shortcuts etc.
      setGlobal(!globalIsOpen);
    }
  });
}

function subscribeToOpen(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getOpenSnapshot(): boolean {
  return globalIsOpen;
}

function getOpenServerSnapshot(): boolean {
  return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSearchKeyboard() {
  // useSyncExternalStore keeps every consumer in sync with the singleton without
  // a set-state-in-effect subscription effect.
  const isOpen = useSyncExternalStore(subscribeToOpen, getOpenSnapshot, getOpenServerSnapshot);

  const openSearch = useCallback(() => setGlobal(true), []);
  const closeSearch = useCallback(() => setGlobal(false), []);
  const toggleSearch = useCallback(() => setGlobal(!globalIsOpen), []);

  return { isOpen, openSearch, closeSearch, toggleSearch };
}
