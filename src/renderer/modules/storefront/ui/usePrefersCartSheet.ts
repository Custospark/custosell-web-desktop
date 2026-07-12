import { useSyncExternalStore } from 'react';

/** Phones + tablets: cart as overlay sheet. Desktop (lg+): docked panel. */
export function usePrefersCartSheet(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(max-width: 1023px)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => true,
  );
}
