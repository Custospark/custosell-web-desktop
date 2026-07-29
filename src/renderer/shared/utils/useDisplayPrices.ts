import { useAppSelector } from '../../app/store/hooks/useApp';
import { useCurrencyConvert } from '../api/currency/CurrencyQueries';
import type { Plan } from '../types';

const usd = (v: string | number | null | undefined): number => Number(v) || 0;

export function useDisplayPrices() {
  const business = useAppSelector((s) => s.auth.user?.business);
  const currency = business?.currency || 'UGX';
  const isLocalCurrency = currency !== 'USD';

  const { data: rateData } = useCurrencyConvert(1, 'USD', currency);
  const exchangeRate = rateData?.converted ?? null;

  const rateUsable = !isLocalCurrency || exchangeRate !== null;

  function monthlyPrice(plan: Plan): number {
    const base = usd(plan.price_monthly_usd);
    if (rateUsable) return Math.round(base * (exchangeRate ?? 1) * 100) / 100;
    return 0;
  }

  function yearlyPrice(plan: Plan): number {
    const base = usd(plan.price_yearly_usd) || usd(plan.price_monthly_usd) * 10;
    if (rateUsable) return Math.round(base * (exchangeRate ?? 1) * 100) / 100;
    return 0;
  }

  function onboardingFee(plan: Plan): number {
    const base = usd(plan.onboarding_fee_usd);
    if (rateUsable) return Math.round(base * (exchangeRate ?? 1) * 100) / 100;
    return 0;
  }

  function usdMonthlyPrice(plan: Plan): number {
    return usd(plan.price_monthly_usd);
  }

  function usdYearlyPrice(plan: Plan): number {
    return usd(plan.price_yearly_usd) || usdMonthlyPrice(plan) * 10;
  }

  function usdOnboardingFee(plan: Plan): number {
    return usd(plan.onboarding_fee_usd);
  }

  return { currency, exchangeRate, monthlyPrice, yearlyPrice, onboardingFee, usdMonthlyPrice, usdYearlyPrice, usdOnboardingFee };
}
