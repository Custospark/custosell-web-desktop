import { store } from '../../app/store/store';
import { CURRENCY_SYMBOLS } from './currencies';

export function getBusinessCurrency(): string {
  try {
    const state = store.getState();
    const business = (state as { auth?: { user?: { business?: { currency?: string } } } }).auth?.user?.business;
    return business?.currency || 'UGX';
  } catch {
    return 'UGX';
  }
}

function symbolFor(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(amount: string | number, currencyCode?: string): string {
  const code = (currencyCode || getBusinessCurrency()).toUpperCase();
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return `${symbolFor(code)}0.00`;

  const formatted = numericAmount.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${symbolFor(code)} ${parts.join('.')}`;
}

export function formatUSD(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '$0.00';

  const formatted = numericAmount.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `$${parts.join('.')}`;
}
