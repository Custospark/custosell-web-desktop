import { ROUTES } from '../../../app/routes/constants/shared.paths';

export interface OnlineOnlyNavEntry {
  /** Match pathname that equals prefix or starts with `${prefix}/`. */
  prefix: string;
  /** Short name for hover / banner title. */
  label: string;
  /** Hover + banner body. */
  message: string;
}

const DEFAULT_MESSAGE = 'This area needs an internet connection. Reconnect to use it.';

/** Paths that must not be navigated to while completely offline. Longest prefixes first. */
export const ONLINE_ONLY_NAV_ENTRIES: OnlineOnlyNavEntry[] = [
  {
    prefix: ROUTES.INVENTORY.PURCHASE_ORDERS,
    label: 'Purchase orders',
    message: 'Purchase orders are online-only. Reconnect to create or manage orders.',
  },
  {
    prefix: ROUTES.INVENTORY.INCOMING_ORDERS,
    label: 'Incoming orders',
    message: 'Incoming orders are online-only. Reconnect to accept or fulfill orders.',
  },
  {
    prefix: ROUTES.INVENTORY.MARKETPLACE,
    label: 'Marketplace',
    message: 'Marketplace is online-only. Reconnect to browse suppliers and catalogs.',
  },
  {
    prefix: ROUTES.INVOICES.SUPPLIER,
    label: 'Supplier invoices',
    message: 'Supplier invoices are online-only. Reconnect to view B2B invoices.',
  },
  {
    prefix: ROUTES.PIPELINE.INDEX,
    label: 'Pipeline',
    message: 'Pipeline needs a connection. Reconnect to work boards and leads.',
  },
  {
    prefix: ROUTES.ESTIMATES.INDEX,
    label: 'Projects & Estimates',
    message: 'Projects & Estimates are online-only. Reconnect to continue.',
  },
  {
    prefix: ROUTES.DOCUMENTS.INDEX,
    label: 'Documents',
    message: 'Documents need a connection. Reconnect to browse business files.',
  },
  {
    prefix: ROUTES.FORECASTING.INDEX,
    label: 'Forecasting',
    message: 'Forecasting is online-only. Reconnect to view cash and scenarios.',
  },
  {
    prefix: ROUTES.HR.INDEX,
    label: 'HR & Payroll',
    message: 'HR & Payroll needs a connection. Reconnect to manage people and payroll.',
  },
  {
    prefix: ROUTES.ACCOUNTING.INDEX,
    label: 'Accounting',
    message: 'Accounting is online-only. Reconnect to view books and statements.',
  },
  {
    prefix: ROUTES.PLATFORM.INDEX,
    label: 'Platform',
    message: 'Platform admin needs a connection. Reconnect to continue.',
  },
].sort((a, b) => b.prefix.length - a.prefix.length);

/** Launcher module tiles blocked when completely offline. Inventory stays open (products). */
export const ONLINE_ONLY_LAUNCHER_SLUGS = new Set<string>([
  'pipeline',
  'estimates',
  'documents',
  'forecasting',
  'hr',
  'accounting',
  'platform',
  'guide_settings',
]);

export function matchOnlineOnlyPath(pathname: string): OnlineOnlyNavEntry | null {
  const path = pathname.split('?')[0] ?? pathname;
  for (const entry of ONLINE_ONLY_NAV_ENTRIES) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry;
    }
  }
  return null;
}

export function isOnlineOnlyNavTarget(to: string): boolean {
  return matchOnlineOnlyPath(to) !== null;
}

export function onlineOnlyHoverMessage(to: string): string {
  return matchOnlineOnlyPath(to)?.message ?? DEFAULT_MESSAGE;
}

export function isOnlineOnlyLauncherSlug(slug: string): boolean {
  return ONLINE_ONLY_LAUNCHER_SLUGS.has(slug);
}

export function launcherOfflineMessage(slug: string): string {
  const bySlug: Record<string, string> = {
    pipeline: 'Pipeline needs a connection. Reconnect to work boards and leads.',
    estimates: 'Projects & Estimates are online-only. Reconnect to continue.',
    documents: 'Documents need a connection. Reconnect to browse business files.',
    forecasting: 'Forecasting is online-only. Reconnect to view cash and scenarios.',
    hr: 'HR & Payroll needs a connection. Reconnect to manage people and payroll.',
    accounting: 'Accounting is online-only. Reconnect to view books and statements.',
    platform: 'Platform admin needs a connection. Reconnect to continue.',
    guide_settings: 'Guide Settings need a connection. Reconnect to continue.',
  };
  return bySlug[slug] ?? DEFAULT_MESSAGE;
}
