/** Sales per POST /sales/batch request. */
export const SALES_BATCH_SIZE = 25;

/** Pause between sales batches (ms) - keeps UI responsive and avoids server spikes. */
export const BATCH_PAUSE_MS = 400;

/** Network / 5xx retries before falling back to per-item sync. */
export const NETWORK_RETRY_MAX = 3;

/** Backoff delays between retries (ms). */
export const NETWORK_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/** Sales batch request timeout (ms). */
export const SALES_BATCH_TIMEOUT_MS = 60_000;

export const SYNC_TIER_LABELS = {
  0: 'Account',
  1: 'Foundation',
  2: 'Transactions',
  3: 'Closures',
  4: 'Stock',
} as const;

export type SyncTierIndex = keyof typeof SYNC_TIER_LABELS;
