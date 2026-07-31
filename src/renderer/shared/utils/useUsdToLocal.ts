import { useCurrencyConvert } from '../api/currency/CurrencyQueries';

export function useUsdToLocal(currency: string): { isUsd: boolean; toLocal: (usdAmount: number) => number } {
  const isUsd = (currency || '').toUpperCase() === 'USD';
  const { data: rateData } = useCurrencyConvert(1, 'USD', currency);
  const exchangeRate = isUsd ? 1 : (rateData?.converted ?? null);

  function toLocal(usdAmount: number): number {
    const amount = Number(usdAmount) || 0;
    if (isUsd) return amount;
    if (exchangeRate === null) return 0;
    return Math.round(amount * exchangeRate * 100) / 100;
  }

  return { isUsd, toLocal };
}
