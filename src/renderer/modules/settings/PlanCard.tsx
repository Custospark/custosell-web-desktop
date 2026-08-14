import { ArrowDown, X, Check, Sparkles, Star, AlertCircle, CheckCircle, CalendarX } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import { getPlanAction } from './planActionMatrix';
import { FEATURE_CATALOG, LIMIT_LABELS } from './planConstants';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import type { PlanAction } from './planActionMatrix';

interface PlanCardProps {
  plan: Plan;
  index: number;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
  onboardingFee: (plan: Plan) => number;
  monthlyPriceFn: (plan: Plan) => number;
  yearlyPriceFn: (plan: Plan) => number;
  subscription: SubscriptionInfo;
  currentPlan: Plan | null;
  currentPlanSortOrder: number;
  downgradePlan: Plan | null;
  downgradeConfirmed: boolean;
  downgradeMutation: { isPending: boolean };
  handleAction: (plan: Plan, action: PlanAction) => void;
  handleDowngradeAction: (plan: Plan) => void;
  setDowngradePlan: (plan: Plan | null) => void;
  setDowngradeConfirmed: (confirmed: boolean) => void;
  pendingChange: Record<string, unknown> | null;
  cancelChangeLoading: boolean;
  onCancelScheduledChange: () => void;
}

export default function PlanCard({
  plan,
  index,
  billingCycle,
  currency,
  onboardingFee,
  monthlyPriceFn,
  yearlyPriceFn,
  subscription,
  currentPlan,
  currentPlanSortOrder,
  downgradePlan,
  downgradeConfirmed,
  downgradeMutation,
  handleAction,
  handleDowngradeAction,
  setDowngradePlan,
  setDowngradeConfirmed,
  pendingChange,
  cancelChangeLoading,
  onCancelScheduledChange,
}: PlanCardProps) {
  const action = getPlanAction(plan, subscription, currentPlanSortOrder, currentPlan?.type);
  const isCurrentPlan = plan.id === subscription.plan_id;
  const isYearly = billingCycle === 'yearly';

  const usdPrice = isYearly ? Number(plan.price_yearly_usd ?? 0) : Number(plan.price_monthly_usd ?? 0);
  const usdMonthlyPriceVal = Number(plan.price_monthly_usd ?? 0);

  const localPrice = isYearly ? yearlyPriceFn(plan) : monthlyPriceFn(plan);
  const fee = onboardingFee(plan);
  const features = Object.entries(plan.features).filter(([, v]) => v);
  const limits = Object.entries(plan.limits).filter(([, v]) => v !== null) as [string, number][];

  const isDowngradeScheduledForThisPlan =
    pendingChange?.change_type === 'downgrade'
    && pendingChange?.status === 'pending'
    && Number(pendingChange.to_plan_id) === plan.id
    && !isCurrentPlan;

  const scheduledEffectiveDate = pendingChange?.effective_at
    ? new Date(pendingChange.effective_at as string).toLocaleDateString()
    : null;

  const accent = (
    [
      { bg: 'bg-gradient-to-br from-white to-green-50/50', border: 'border-green-200', borderHover: 'hover:border-green-300', borderSelected: 'border-green-500', ring: 'ring-green-200', name: 'text-green-800', glow: 'bg-green-500/10', save: 'text-green-600', check: 'text-green-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
      { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
      { bg: 'bg-gradient-to-br from-white to-indigo-50/50', border: 'border-indigo-200', borderHover: 'hover:border-indigo-300', borderSelected: 'border-indigo-500', ring: 'ring-indigo-200', name: 'text-indigo-800', glow: 'bg-indigo-500/10', save: 'text-indigo-600', check: 'text-indigo-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
    ][index] ?? { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' }
  );

  return (
    <div
      className={cn(
        'relative rounded-2xl p-6 transition-all flex flex-col border-2',
        accent.bg,
        isCurrentPlan
          ? `${accent.borderSelected} ring-2 ${accent.ring} shadow-lg`
          : `${accent.border} ${accent.borderHover} hover:shadow-md`,
      )}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            <Star className="w-3 h-3 fill-white" />
            Current Plan
          </span>
        </div>
      )}

      {isDowngradeScheduledForThisPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            <ArrowDown className="w-3 h-3" />
            Downgrade scheduled
          </span>
        </div>
      )}

      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${accent.glow}`} />
      </div>

      {plan.is_popular && !isCurrentPlan && action.type !== 'resubscribe' && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}

      <div className={cn('space-y-4 flex flex-col flex-1', plan.is_popular && !isCurrentPlan && action.type !== 'resubscribe' && 'pt-2')}>
        <div className="text-center">
          <h3 className={`text-xl font-bold ${accent.name}`}>{plan.name}</h3>
          {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
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

          {isYearly && usdMonthlyPriceVal > 0 && (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-gray-400">
                ~{formatUSD(usdMonthlyPriceVal)}/mo
              </p>
              {(() => {
                const monthlyUsdTotal = usdMonthlyPriceVal * 12;
                const saved = monthlyUsdTotal - usdPrice;
                const pct = Math.round((saved / monthlyUsdTotal) * 100);
                return (
                  <p className={`text-xs font-semibold ${accent.save}`}>
                    Save {formatUSD(saved)} ({pct}%)
                  </p>
                );
              })()}
            </div>
          )}

          {Number(plan.onboarding_fee_usd ?? 0) > 0 && (
            <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">One time set up fee</p>
              <p className="text-sm font-bold text-blue-800">{formatUSD(Number(plan.onboarding_fee_usd))}</p>
              {currency !== 'USD' && fee > 0 && (
                <p className="text-[11px] text-blue-600">≈ {formatCurrency(fee, currency)}</p>
              )}
            </div>
          )}
        </div>

        {plan.trial_days ? (
          <div className="text-center">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full">
              Enjoy {plan.trial_days} days of free use
            </span>
          </div>
        ) : null}

        <div className="flex-1 border-t border-gray-100 pt-4 space-y-3">
          {features.map(([key]) => {
            const feature = FEATURE_CATALOG[key];
            return (
              <div key={key} className="flex items-start gap-2.5">
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent.check}`} />
                <div>
                  <span className="text-sm font-medium text-gray-700">{feature?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  {feature?.description && <p className="text-xs text-gray-400 leading-tight">{feature.description}</p>}
                </div>
              </div>
            );
          })}
          {limits.length > 0 && (
            <div className="border-t border-gray-50 pt-3 mt-3 space-y-1.5">
              {limits.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs text-gray-400">
                  <span>{LIMIT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <span className="font-semibold text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCurrentPlan && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-xl">
              <CheckCircle className="w-3.5 h-3.5" />
              Current Plan
            </span>
          </div>
        )}

        {isDowngradeScheduledForThisPlan && scheduledEffectiveDate && (
          <div className="mt-4 space-y-2">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-4 py-2 rounded-xl">
                <CalendarX className="w-3.5 h-3.5" />
                Takes effect {scheduledEffectiveDate}
              </span>
            </div>
            <button
              type="button"
              disabled={cancelChangeLoading}
              onClick={onCancelScheduledChange}
              className="w-full text-sm font-semibold py-2.5 px-4 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {cancelChangeLoading ? 'Cancelling...' : 'Cancel Scheduled Downgrade'}
            </button>
          </div>
        )}

        {action.type !== 'current' && !isDowngradeScheduledForThisPlan && (
          <button
            type="button"
            disabled={action.type === 'downgrade' && downgradeMutation.isPending}
            onClick={() => handleAction(plan, action)}
            className={cn(
              'mt-4 w-full text-sm font-semibold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all',
              action.type === 'downgrade'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 shadow-md hover:shadow-lg',
              action.type === 'downgrade' && downgradeMutation.isPending
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer',
            )}
          >
            {action.type === 'downgrade' && downgradeMutation.isPending ? 'Scheduling...'
              : action.label}
          </button>
        )}

        {action.type === 'downgrade' && downgradePlan?.id === plan.id && !downgradeConfirmed && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Scheduled downgrade</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your access stays the same until the end of the billing period. After that, these changes take effect:
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-amber-800">
              {Object.entries(plan.features).map(([key, enabled]) => {
                if (!enabled && currentPlan?.features?.[key]) {
                  const info = FEATURE_CATALOG[key];
                  return (
                    <div key={key} className="flex items-start gap-1.5">
                      <X className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <span><strong>{info?.label ?? key}</strong> - {info?.description ?? 'Feature removed'}</span>
                    </div>
                  );
                }
                return null;
              })}
              {Object.entries(plan.limits).map(([key, value]) => {
                const currentValue = currentPlan?.limits?.[key];
                if (currentValue != null && (value == null || Number(value) < Number(currentValue))) {
                  return (
                    <div key={key} className="flex items-start gap-1.5">
                      <X className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <span><strong>{LIMIT_LABELS[key] ?? key}</strong> reduced from {currentValue} to {value ?? '0'}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setDowngradeConfirmed(true)}
                className="flex-1 bg-amber-500 text-white text-sm font-semibold py-2 px-3 rounded-xl hover:bg-amber-600 transition-colors">
                Schedule Downgrade
              </button>
              <button type="button" onClick={() => { setDowngradePlan(null); setDowngradeConfirmed(false); }}
                className="flex-1 bg-white text-gray-600 text-sm font-medium py-2 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {action.type === 'downgrade' && downgradePlan?.id === plan.id && downgradeConfirmed && (
          <div className="space-y-2 mt-3">
            <p className="text-xs text-gray-500 text-center">The downgrade will take effect at the end of your current billing period.</p>
            <button type="button" disabled={downgradeMutation.isPending} onClick={() => handleDowngradeAction(plan)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
              <ArrowDown className="w-4 h-4" />
              Schedule Downgrade
            </button>
            <button type="button" onClick={() => { setDowngradePlan(null); setDowngradeConfirmed(false); }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
