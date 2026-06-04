import { CURRENCY_SYMBOLS } from './currencies';

function symbolFor(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(amount: string | number, currencyCode = 'UGX'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return `${symbolFor(currencyCode)}0.00`;

  const formatted = numericAmount.toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${symbolFor(currencyCode)} ${parts.join('.')}`;
}
