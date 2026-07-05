import { store } from '../../app/store/store';

/** Mirror backend DocumentNumberGenerator.businessCode for offline docs. */
export function offlineBusinessCode(): string {
  const business = store.getState().auth.user?.business;
  const raw = (business?.slug || business?.name || '').replace(/[^a-zA-Z0-9]/g, '');
  const code = raw.slice(0, 4).toUpperCase();
  if (!code) return 'BIZX';
  return code.padEnd(4, 'X');
}

export function offlineSaleReceiptNumber(): string {
  const code = offlineBusinessCode();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 9).toUpperCase();
  return `${code}-SAL-${date}-${rand}`;
}

export function offlinePaymentReceiptNumber(): string {
  const code = offlineBusinessCode();
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${code}-RCP-${ym}-${rand}`;
}
