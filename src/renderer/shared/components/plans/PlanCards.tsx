import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLANS } from '../../api/endpoints/endpoints';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Plan } from '../../types';
import { CustosellLoader } from '../loading/CustosellLoader';

const FEATURE_CATALOG: Record<string, { label: string; description: string }> = {
  sales: { label: 'Point of Sale', description: 'Complete POS with orders, history & refunds' },
  inventory: { label: 'Inventory Management', description: 'Products, stock ledger & supply chain' },
  customers: { label: 'Customer Management', description: 'Customer profiles & purchase history' },
  expenses: { label: 'Expense Tracking', description: 'Record and categorize expenses' },
  dashboard: { label: 'Dashboard & Analytics', description: 'Real-time business performance' },
  invoices: { label: 'Invoicing', description: 'Create and send invoices' },
  pipeline: { label: 'Sales Pipeline', description: 'Boards, leads & team collaboration' },
  estimates: { label: 'Estimates & Projects', description: 'Quotes, projects & templates' },
  storefront: { label: 'Online Storefront', description: 'Sell online with custom storefront' },
  marketplace: { label: 'Supply Marketplace', description: 'Source products from other businesses' },
  documents: { label: 'Document Management', description: 'Secure file storage & e-signatures' },
  accounting: { label: 'Full Accounting', description: 'Chart of accounts & financial reports' },
  hr: { label: 'HR & Payroll', description: 'Employee mgmt, attendance & payroll' },
  forecasting: { label: 'Forecasting & Budgets', description: 'Financial projections & budgets' },
};

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

export function useActivePlans() {
  return useQuery({
    queryKey: ['plans', 'active'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(`${PLANS}/active`);
      return data.data;
    },
    staleTime: 0,
  });
}

interface PlanCardsProps {
  plans: Plan[];
  selectedPlanId?: number | null;
  onSelect?: (plan: Plan) => void;
  billingCycle?: 'monthly' | 'yearly';
  onBillingCycleChange?: (cycle: 'monthly' | 'yearly') => void;
  hideTrialBadge?: boolean;
  hideOnboardingFee?: boolean;
}

export function PlanCards({ plans, selectedPlanId, onSelect, billingCycle = 'monthly', onBillingCycleChange, hideTrialBadge, hideOnboardingFee }: PlanCardsProps) {
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
          const price = billingCycle === 'yearly' && plan.price_yearly
            ? Number(plan.price_yearly) : Number(plan.price_monthly);
          const onboardingFee = plan.onboarding_fee_ugx;
          const features = Object.entries(plan.features).filter(([, v]) => v);
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
                'relative rounded-2xl p-6 transition-all flex flex-col overflow-hidden border-2',
                accent.bg,
                selectedPlanId === plan.id
                  ? `${accent.borderSelected} ${accent.ring} shadow-lg`
                  : onSelect
                    ? `${accent.border} ${accent.borderHover} hover:shadow-md cursor-pointer`
                    : accent.border,
              )}
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${accent.glow}`} />

              {plan.is_popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
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
                      {price > 0
                        ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(price)
                        : 'Free'}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-gray-400 font-medium">
                        /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>

                  {billingCycle === 'yearly' && plan.price_monthly && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-400">
                        ~{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Math.round(Number(plan.price_yearly) / 12))}/mo
                      </p>
                      {(() => {
                        const monthlyTotal = Number(plan.price_monthly) * 12;
                        const saved = monthlyTotal - Number(plan.price_yearly);
                        const pct = Math.round((saved / monthlyTotal) * 100);
                        return (
                          <p className={`text-xs font-semibold ${accent.save}`}>
                            Save {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(saved)} ({pct}%)
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {!hideOnboardingFee && onboardingFee ? (
                    <div className="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">One time set up fee</p>
                      <p className="text-sm font-bold text-amber-800">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(onboardingFee))}
                      </p>
                    </div>
                  ) : !hideOnboardingFee ? (
                    <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">One time set up fee</p>
                      <p className="text-sm font-bold text-green-800">Free</p>
                    </div>
                  ) : null}
                </div>

                {!hideTrialBadge && plan.trial_days ? (
                  <div className="text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full">
                      {plan.trial_days}-day free trial after setup
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
