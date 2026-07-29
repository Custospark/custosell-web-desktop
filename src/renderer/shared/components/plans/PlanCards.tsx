import { Check, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDisplayPrices } from '../../utils/useDisplayPrices';
import { formatCurrency, formatUSD } from '../../utils/formatCurrency';
import type { Plan } from '../../types';
import { CustosellLoader } from '../loading/CustosellLoader';

const FEATURE_CATALOG: Record<string, { label: string; description: string }> = {
  sales: { label: 'Point of Sale', description: 'Complete point of sale with orders, history & refunds' },
  storefront: { label: 'Online Storefront', description: 'Sell online with your own custom storefront' },
  inventory: { label: 'Inventory & Supply Chain', description: 'Products, stock ledger & supply chain management' },
  accounting: { label: 'Full Accounting', description: 'Chart of accounts, financial reports & reconciliations' },
  hr: { label: 'HR & Payroll', description: 'Employee management, attendance & payroll processing' },
  expenses: { label: 'Expense Tracking', description: 'Record, categorize and analyse expenses' },
  estimates: { label: 'Project Management', description: 'Quotes, projects & reusable templates' },
  pipeline: { label: 'Sales Pipeline (CRM)', description: 'CRM boards, leads & team collaboration' },
  forecasting: { label: 'Financial Forecasting', description: 'Financial projections, budgets & cash flow' },
  documents: { label: 'Document Management', description: 'Secure file storage, sharing & e-signatures' },
  customers: { label: 'Customer Management', description: 'Customer profiles & purchase history' },
  dashboard: { label: 'Dashboard & Analytics', description: 'Real-time business performance metrics' },
  marketplace: { label: 'Supply Marketplace', description: 'Source products from other businesses' },
};

const FEATURE_ORDER = Object.keys(FEATURE_CATALOG);

const LIMIT_LABELS: Record<string, string> = {
  max_staff: 'Staff accounts',
  max_products: 'Products',
  max_businesses: 'Business locations',
};

function featureLabel(key: string): string {
  return FEATURE_CATALOG[key]?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function featureDescription(key: string): string | null {
  return FEATURE_CATALOG[key]?.description ?? null;
}

function limitLabel(key: string): string {
  return LIMIT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PlanCardsProps {
  plans: Plan[];
  selectedPlanId?: number | null;
  onSelect?: (plan: Plan) => void;
  billingCycle?: 'monthly' | 'yearly';
  onBillingCycleChange?: (cycle: 'monthly' | 'yearly') => void;
  hideTrialBadge?: boolean;
  hideOnboardingFee?: boolean;
  ctaLabel?: string;
}

export function PlanCards({ plans, selectedPlanId, onSelect, billingCycle = 'monthly', onBillingCycleChange, hideTrialBadge, hideOnboardingFee, ctaLabel = 'Get Started' }: PlanCardsProps) {
  const { currency, monthlyPrice, yearlyPrice, onboardingFee, usdMonthlyPrice, usdYearlyPrice, usdOnboardingFee } = useDisplayPrices();
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {onBillingCycleChange && (
        <div className="flex justify-center">
          <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                billingCycle === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Yearly
              <span className="ml-1.5 text-[10px] text-blue-600 font-bold uppercase">Save</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {sorted.map((plan, index) => {
          const isYearly = billingCycle === 'yearly';
          const usdPrice = isYearly ? usdYearlyPrice(plan) : usdMonthlyPrice(plan);
          const localPrice = isYearly ? yearlyPrice(plan) : monthlyPrice(plan);
          const fee = onboardingFee(plan);
          const usdFee = usdOnboardingFee(plan);
          const features = Object.entries(plan.features)
            .filter(([, v]) => v)
            .sort(([a], [b]) => FEATURE_ORDER.indexOf(a) - FEATURE_ORDER.indexOf(b));
          const limits = Object.entries(plan.limits).filter(([, v]) => v !== null) as [string, number][];

          const accent = (
            [
              { bg: 'bg-gradient-to-br from-white to-green-50/50', border: 'border-green-200', borderHover: 'hover:border-green-300', borderSelected: 'border-green-500', ring: 'ring-green-200', name: 'text-green-800', glow: 'bg-green-500/10', save: 'text-green-600', check: 'text-green-500' },
              { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500' },
              { bg: 'bg-gradient-to-br from-white to-indigo-50/50', border: 'border-indigo-200', borderHover: 'hover:border-indigo-300', borderSelected: 'border-indigo-500', ring: 'ring-indigo-200', name: 'text-indigo-800', glow: 'bg-indigo-500/10', save: 'text-indigo-600', check: 'text-indigo-500' },
            ][index] ?? { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500' }
          );

          return (
            <div
              key={plan.id}
              onClick={() => onSelect?.(plan)}
              className={cn(
                'relative rounded-2xl p-6 transition-all flex flex-col border-2',
                accent.bg,
                selectedPlanId === plan.id
                  ? `${accent.borderSelected} ${accent.ring} shadow-lg`
                  : onSelect
                    ? `${accent.border} ${accent.borderHover} hover:shadow-md cursor-pointer`
                    : accent.border,
              )}
            >
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${accent.glow}`} />
              </div>

              {plan.is_popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className={cn('space-y-4 flex flex-col flex-1', plan.is_popular && 'pt-2')}>
                <div className="text-center">
                  <h3 className={`text-xl font-bold ${accent.name}`}>{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  )}
                </div>

                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                      {usdPrice > 0
                        ? formatUSD(usdPrice)
                        : 'Free'}
                    </span>
                    {usdPrice > 0 && (
                      <span className="text-sm text-gray-400 font-medium">
                        /{isYearly ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>

                  {localPrice > 0 && currency !== 'USD' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      ≈ {formatCurrency(localPrice, currency)}/{isYearly ? 'yr' : 'mo'}
                    </p>
                  )}

                  {isYearly && usdMonthlyPrice(plan) > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-400">
                        ~{formatUSD(usdMonthlyPrice(plan))}/mo
                      </p>
                      {(() => {
                        const monthlyUsdTotal = usdMonthlyPrice(plan) * 12;
                        const saved = monthlyUsdTotal - usdYearlyPrice(plan);
                        const pct = Math.round((saved / monthlyUsdTotal) * 100);
                        return (
                          <p className={`text-xs font-semibold ${accent.save}`}>
                            Save {formatUSD(saved)} ({pct}%)
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {!hideOnboardingFee && usdFee ? (
                    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">One time set up fee</p>
                      <p className="text-sm font-bold text-blue-800">{formatUSD(usdFee)}</p>
                      {currency !== 'USD' && fee > 0 && (
                        <p className="text-[11px] text-blue-600">≈ {formatCurrency(fee, currency)}</p>
                      )}
                    </div>
                  ) : !hideOnboardingFee ? (
                    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">One time set up fee</p>
                      <p className="text-sm font-bold text-blue-800">Free</p>
                    </div>
                  ) : null}
                </div>

                {!hideTrialBadge && plan.trial_days ? (
                  <div className="text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full">
                      {plan.trial_days}-day trial after setup
                    </span>
                  </div>
                ) : null}

                <div className="flex-1 border-t border-gray-100 pt-4 space-y-3">
                  {features.map(([key]) => (
                    <div key={key} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent.check}`} />
                      <div>
                        <span className="text-sm font-medium text-gray-700">{featureLabel(key)}</span>
                        {featureDescription(key) && (
                          <p className="text-xs text-gray-400 leading-tight">{featureDescription(key)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {limits.length > 0 && (
                    <div className="border-t border-gray-50 pt-3 mt-3 space-y-1.5">
                      {limits.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs text-gray-400">
                          <span>{limitLabel(key)}</span>
                          <span className="font-semibold text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(plan)}
                    className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
                  >
                    {ctaLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlansLoading() {
  return (
    <div className="flex justify-center py-12">
      <CustosellLoader fullPage={false} />
    </div>
  );
}

export function PlansError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500 text-sm mb-3">Unable to load pricing plans.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
