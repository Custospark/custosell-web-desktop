const PHASE_COPY: Record<string, string> = {
  Account: 'Syncing account',
  Foundation: 'Setting up shifts & categories',
  Sales: 'Uploading sales',
  'Products & expenses': 'Syncing products & expenses',
  Transactions: 'Uploading transactions',
  'Shift closures': 'Closing shifts',
  'Other updates': 'Applying updates',
  Closures: 'Closing shifts',
  Stock: 'Updating inventory',
};

export function getSyncHeadline(phaseLabel: string, isPaused: boolean, isOffline: boolean): string {
  if (isPaused && isOffline) return 'Offline — sync will continue when connected';
  if (isPaused) return 'Sync paused';
  if (phaseLabel && PHASE_COPY[phaseLabel]) return `${PHASE_COPY[phaseLabel]}…`;
  return 'Sync in progress';
}

export function getSyncDetailLabel(phaseLabel: string): string {
  return phaseLabel || 'Processing';
}

export function formatEtaMinutes(remainingItems: number, itemsPerMinute: number): string | null {
  if (itemsPerMinute <= 0 || remainingItems <= 0) return null;
  const minutes = Math.ceil(remainingItems / itemsPerMinute);
  if (minutes < 1) return 'Less than a minute left';
  if (minutes === 1) return 'About 1 minute left';
  return `About ${minutes} minutes left`;
}
