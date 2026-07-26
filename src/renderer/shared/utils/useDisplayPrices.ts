import { useAppSelector } from '../../app/store/hooks/useApp';
import { useCurrencyConvert } from '../api/currency/CurrencyQueries';
import type { Plan } from '../types';

export function useDisplayPrices() {
  const business = useAppSelector((s) => s.auth.user?.business);
  const currency = business?.currency || 'UGX';

  const { data: rateData } = useCurrencyConvert(1, 'USD', currency);
  const exchangeRate = rateData?.converted ?? null;

  function monthlyPrice(plan: Plan): number {
    if (currency === 'UGX') return Number(plan.price_monthly) || 0;
    if (currency === 'USD') return Number(plan.price_monthly_usd) || 0;
    const usd = Number(plan.price_monthly_usd) || Number(plan.price_monthly) / 3700 || 0;
    return exchangeRate !== null ? Math.round(usd * exchangeRate * 100) / 100 : usd;
  }

  function onboardingFee(plan: Plan): number {
    if (currency === 'UGX') return Number(plan.onboarding_fee_ugx) || 0;
    if (currency === 'USD') return Number(plan.onboarding_fee_usd) || 0;
    const usd = Number(plan.onboarding_fee_usd) || Number(plan.onboarding_fee_ugx) / 3700 || 0;
    return exchangeRate !== null ? Math.round(usd * exchangeRate * 100) / 100 : usd;
  }

  return { currency, exchangeRate, monthlyPrice, onboardingFee };
}
