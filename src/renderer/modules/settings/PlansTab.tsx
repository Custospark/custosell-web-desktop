import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { useUpgrade, useDowngrade } from '../../shared/api/account/AccountQueries';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import {
  CheckCircle, AlertCircle, Clock, CalendarDays,
  Check, Sparkles,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';

const FEATURE_CATALOG: Record<string, { label: string; description: string }> = {
  sales: { label: 'Point of Sale', description: 'Complete POS with orders, history & refunds' },
  inventory: { label: 'Inventory Management', description: 'Products, stock ledger & supply chain' },
  customers: { label: 'Customer Management', description: 'Customer profiles & purchase history' },
  expenses: { label: 'Expense Tracking', description: 'Record and categorize expenses' },
  dashboard: { label: 'Dashboard & Analytics', description: 'Real-time business performance' },
  storefront: { label: 'Online Storefront', description: 'Sell online with custom storefront' },
  pipeline: { label: 'Sales Pipeline', description: 'Boards, leads & team collaboration' },
  estimates: { label: 'Estimates & Projects', description: 'Quotes, projects & templates' },
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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Past Due' },
  suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expired' },
};

const NON_ACTIVE_STATUSES = new Set(['expired', 'suspended', 'cancelled']);

function getPlanAction(plan: Plan, subscription: SubscriptionInfo | undefined, currentPlanSortOrder: number): {
  type: 'subscribe' | 'resubscribe' | 'upgrade' | 'downgrade' | 'current';
  label: string;
} {
  if (!subscription) return { type: 'subscribe', label: 'Subscribe' };
  if (NON_ACTIVE_STATUSES.has(subscription.status) && plan.id === subscription.plan_id) {
    return { type: 'resubscribe', label: 'Re-subscribe' };
  }
  if (plan.id === subscription.plan_id) return { type: 'current', label: 'Current Plan' };
  if (plan.sort_order > currentPlanSortOrder) return { type: 'upgrade', label: 'Upgrade' };
  if (plan.sort_order < currentPlanSortOrder) return { type: 'downgrade', label: 'Downgrade' };
  return { type: 'subscribe', label: 'Subscribe' };
}

interface SubscriptionPaymentState {
  planName: string;
  planPrice: number;
  billingCycle: string;
  amount: number;
  actionLabel: string;
}

interface PlansTabProps {
  subscription: SubscriptionInfo;
  onUpgradeComplete?: () => void;
}

export default function PlansTab({ subscription, onUpgradeComplete }: PlansTabProps) {
  const navigate = useNavigate();
  const userPhone = useAppSelector((s) => s.auth.user?.business?.phone || s.auth.user?.phone || '');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [downgradePlan, setDowngradePlan] = useState<Plan | null>(null);
  const [subscriptionPayment, setSubscriptionPayment] = useState<SubscriptionPaymentState | null>(null);
  const upgradeMutation = useUpgrade();
  const downgradeMutation = useDowngrade();

  const { data: plans, isLoading: plansLoading } = useActivePlans();

  const sortedPlans = useMemo(() => {
    return plans ? [...plans].sort((a, b) => a.sort_order - b.sort_order) : [];
  }, [plans]);

  const currentPlan = sortedPlans.find(p => p.id === subscription.plan_id) ?? null;
  const currentPlanSortOrder = currentPlan?.sort_order ?? 0;

  const handleUpgrade = async (plan: Plan) => {
    try {
      const result = await upgradeMutation.mutateAsync({ subscriptionId: Number(subscription.id), to_plan_id: plan.id });
      const due = (result as { proration?: { proration_due?: number } }).proration?.proration_due ?? 0;
      if (due > 0) {
        const price = billingCycle === 'yearly' && plan.price_yearly
          ? Number(plan.price_yearly) : Number(plan.price_monthly);
        setSubscriptionPayment({
          planName: plan.name, planPrice: price, billingCycle,
          amount: due, actionLabel: 'Upgrade',
        });
      } else {
        onUpgradeComplete?.();
      }
    } catch {
      console.warn('Upgrade mutation failed — already handled by mutation onError');
    }
  };

  const handleResubscribe = (plan: Plan) => {
    const price = billingCycle === 'yearly' && plan.price_yearly
      ? Number(plan.price_yearly) : Number(plan.price_monthly);
    setSubscriptionPayment({
      planName: plan.name, planPrice: price, billingCycle,
      amount: price, actionLabel: 'Re-subscribe',
    });
  };

  const handleDowngrade = (plan: Plan, effective: 'immediate' | 'end_of_period') => {
    downgradeMutation.mutate(
      { subscriptionId: Number(subscription.id), to_plan_id: plan.id, effective },
      { onSuccess: () => setDowngradePlan(null) },
    );
  };

  const statusInfo = STATUS_STYLES[subscription.status] || STATUS_STYLES.active;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold">{currentPlan?.name || 'Unknown Plan'}</h2>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', statusInfo.bg, statusInfo.text)}>
            {statusInfo.label}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-blue-100">
            <CalendarDays className="w-4 h-4" />
            <span className="text-sm">
              {subscription.billing_cycle
                ? subscription.billing_cycle === 'yearly' ? 'Yearly billing' : 'Monthly billing'
                : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-100">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {subscription.next_billing_date
                ? `Next bill: ${new Date(subscription.next_billing_date).toLocaleDateString()}`
                : subscription.trial_ends_at
                  ? `Trial ends: ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                  : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-100">
            {subscription.onboarding_fee_paid ? (
              <><CheckCircle className="w-4 h-4 text-green-300" /><span className="text-sm">Setup fee paid</span></>
            ) : (
              <><AlertCircle className="w-4 h-4 text-amber-300" /><span className="text-sm">Setup fee pending</span></>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              billingCycle === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Yearly
            <span className="ml-1.5 text-[10px] text-blue-600 font-bold uppercase">Save</span>
          </button>
        </div>
      </div>

      {plansLoading ? (
        <CustosellLoader fullPage={false} />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {sortedPlans.map((plan, index) => {
            const action = getPlanAction(plan, subscription, currentPlanSortOrder);
            const price = billingCycle === 'yearly' && plan.price_yearly
              ? Number(plan.price_yearly) : Number(plan.price_monthly);
            const onboardingFee = plan.onboarding_fee_ugx;
            const features = Object.entries(plan.features).filter(([, v]) => v);
            const limits = Object.entries(plan.limits).filter(([, v]) => v !== null) as [string, number][];

            const accent = (
              [
                { bg: 'bg-gradient-to-br from-white to-green-50/50', border: 'border-green-200', borderHover: 'hover:border-green-300', borderSelected: 'border-green-500', ring: 'ring-green-200', name: 'text-green-800', glow: 'bg-green-500/10', save: 'text-green-600', check: 'text-green-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
                { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
                { bg: 'bg-gradient-to-br from-white to-indigo-50/50', border: 'border-indigo-200', borderHover: 'hover:border-indigo-300', borderSelected: 'border-indigo-500', ring: 'ring-indigo-200', name: 'text-indigo-800', glow: 'bg-indigo-500/10', save: 'text-indigo-600', check: 'text-indigo-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' },
              ][index] ?? { bg: 'bg-gradient-to-br from-white to-blue-50/50', border: 'border-blue-200', borderHover: 'hover:border-blue-300', borderSelected: 'border-blue-500', ring: 'ring-blue-200', name: 'text-blue-800', glow: 'bg-blue-500/10', save: 'text-blue-600', check: 'text-blue-500', btn: 'from-blue-600 to-blue-800', btnHover: 'hover:from-blue-700 hover:to-blue-900' }
            );

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-2xl p-6 transition-all flex flex-col border-2',
                  accent.bg,
                  action.type === 'current'
                    ? `${accent.borderSelected} ${accent.ring} shadow-lg`
                    : `${accent.border} ${accent.borderHover} hover:shadow-md`,
                )}
              >
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${accent.glow}`} />
                </div>

                  {plan.is_popular && action.type !== 'current' && action.type !== 'resubscribe' && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className={cn('space-y-4 flex flex-col flex-1', plan.is_popular && action.type !== 'current' && action.type !== 'resubscribe' && 'pt-2')}>
                  <div className="text-center">
                    <h3 className={`text-xl font-bold ${accent.name}`}>{plan.name}</h3>
                    {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
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

                    {onboardingFee ? (
                      <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">One time set up fee</p>
                        <p className="text-sm font-bold text-blue-800">
                          {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(onboardingFee))}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">One time set up fee</p>
                        <p className="text-sm font-bold text-blue-800">Free</p>
                      </div>
                    )}
                  </div>

                  {plan.trial_days && (
                    <div className="text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full">
                        {plan.trial_days}-day trial after setup
                      </span>
                    </div>
                  )}

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

                  {action.type === 'current' && (
                    <span className="mt-4 text-center text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-2 rounded-xl">Current Plan</span>
                  )}

                  {action.type === 'subscribe' && (
                    <button type="button" onClick={() => navigate(ROUTES.ONBOARDING)}
                      className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg">
                      Subscribe
                    </button>
                  )}

                  {action.type === 'resubscribe' && (
                    <button type="button" onClick={() => handleResubscribe(plan)}
                      className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg">
                      Re-subscribe
                    </button>
                  )}

                  {action.type === 'upgrade' && (
                    <button type="button" disabled={upgradeMutation.isPending} onClick={() => handleUpgrade(plan)}
                      className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                      {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade'}
                    </button>
                  )}

                  {action.type === 'downgrade' && (
                    downgradePlan?.id === plan.id ? (
                      <div className="mt-4 space-y-2">
                        <button type="button" disabled={downgradeMutation.isPending} onClick={() => handleDowngrade(plan, 'immediate')}
                          className="w-full bg-amber-500 text-white text-sm font-semibold py-2 px-4 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                          Downgrade Now
                        </button>
                        <button type="button" disabled={downgradeMutation.isPending} onClick={() => handleDowngrade(plan, 'end_of_period')}
                          className="w-full bg-white text-gray-700 text-sm font-medium py-2 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50">
                          Schedule Downgrade
                        </button>
                        <button type="button" onClick={() => setDowngradePlan(null)}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDowngradePlan(plan)}
                        className="mt-4 w-full bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all">
                        Downgrade
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 sm:p-8 overflow-x-auto">
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900">
          Feature Comparison
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Feature</th>
              {sortedPlans.map((p) => (
                <th key={p.id} className="text-center py-3 px-2 font-semibold text-blue-600">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(FEATURE_CATALOG).map(([key, { label }]) => (
              <tr key={key} className="border-b border-gray-100 odd:bg-gray-50/50">
                <td className="py-2.5 px-2 font-medium text-gray-700">{label}</td>
                {sortedPlans.map((p) => {
                  const has = p.features?.[key] === true;
                  return (
                    <td key={p.id} className={`text-center py-2.5 px-2 ${has ? 'text-blue-500 font-bold' : 'text-gray-300'}`}>
                      {has ? '✓' : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b border-gray-200">
              <td colSpan={sortedPlans.length + 1} className="py-3 px-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Limits</span>
              </td>
            </tr>
            {Object.entries(LIMIT_LABELS).map(([key, label]) => (
              <tr key={key} className="border-b border-gray-100 odd:bg-gray-50/50">
                <td className="py-2.5 px-2 font-medium text-gray-700">{label}</td>
                {sortedPlans.map((p) => {
                  const val = p.limits?.[key];
                  return (
                    <td key={p.id} className="text-center py-2.5 px-2 font-semibold text-gray-900">
                      {val === null || val === undefined ? '—' : Intl.NumberFormat('en-US').format(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {subscriptionPayment && (
        <SubscriptionPaymentModal
          planName={subscriptionPayment.planName}
          planPrice={subscriptionPayment.planPrice}
          billingCycle={subscriptionPayment.billingCycle}
          amount={subscriptionPayment.amount}
          currency="UGX"
          userPhone={userPhone}
          actionLabel={subscriptionPayment.actionLabel}
          onClose={() => setSubscriptionPayment(null)}
          onComplete={() => { setSubscriptionPayment(null); onUpgradeComplete?.(); }}
        />
      )}
    </div>
  );
}
