import type { QueuedMutation } from './mutationQueue';

const SALE_SCOPED_URL = /^\/sales\/(-?\d+)\/(payment|refund)$/;

export function isSaleScopedMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && SALE_SCOPED_URL.test(m.url);
}

export function isSalePaymentMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && /^\/sales\/-?\d+\/payment$/.test(m.url);
}

export function getSaleIdFromScopedUrl(url: string): number | null {
  const match = url.match(SALE_SCOPED_URL);
  return match ? Number(match[1]) : null;
}

export function remapSaleScopedUrl(url: string, saleIdMap: Map<number, number>): string {
  const match = url.match(SALE_SCOPED_URL);
  if (!match) return url;

  const localId = Number(match[1]);
  const action = match[2];
  const serverId = saleIdMap.get(localId) ?? localId;

  return `/sales/${serverId}/${action}`;
}
