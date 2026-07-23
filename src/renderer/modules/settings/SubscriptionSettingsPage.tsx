import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/PlanCards';
import { useProfile, useUpgrade, useDowngrade, useSubscriptionChanges } from '../../shared/api/account/AccountQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { BILLING } from '../../shared/api/endpoints/endpoints';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import type { Plan, SubscriptionInfo } from '../../shared/types';
import {
  CreditCard, CheckCircle, XCircle, AlertCircle,
  ArrowUp, ArrowDown, Clock, CalendarDays,
  Building2, Loader2, Check, Sparkles,
  History,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';

type SubscriptionTab = 'plans' | 'payments' | 'history';

interface BillingPaymentRecord {
  id: number;
  amount: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Past Due' },
  suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expired' },
};

const TABS: { key: SubscriptionTab; label: string; icon: typeof CreditCard }[] = [
  { key: 'plans', label: 'Plans', icon: CreditCard },
  { key: 'payments', label: 'Payments', icon: Clock },
  { key: 'history', label: 'History', icon: History },
];

function getPlanAction(plan: Plan, subscription: SubscriptionInfo | undefined, currentPlanSortOrder: number): {
  type: 'subscribe' | 'upgrade' | 'downgrade' | 'current';
  label: string;
} {
  if (!subscription) return { type: 'subscribe', label: 'Subscribe' };
  if (plan.id === subscription.plan_id) return { type: 'current', label: 'Current Plan' };
  if (plan.sort_order > currentPlanSortOrder) return { type: 'upgrade', label: 'Upgrade' };
  if (plan.sort_order < currentPlanSortOrder) return { type: 'downgrade', label: 'Downgrade' };
  return { type: 'subscribe', label: 'Subscribe' };
}

export default function SubscriptionSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubscriptionTab>('plans');
  const [downgradePlan, setDowngradePlan] = useState<Plan | null>(null);
  const user = useAppSelector(state => state.auth.user);
  const subscription = user?.business?.subscription;
  const { isFetching: profileLoading } = useProfile();

  const { data: plans, isLoading: plansLoading } = useActivePlans();
  const upgradeMutation = useUpgrade();
  const downgradeMutation = useDowngrade();

  const currentPlan = useMemo(() => {
    if (!plans || !subscription) return null;
    return plans.find(p => p.id === subscription.plan_id) ?? null;
  }, [plans, subscription]);

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BillingPaymentRecord[] }>(BILLING.PAYMENTS);
      return data.data;
    },
    enabled: !!subscription,
  });

  const subId = subscription?.id ?? null;
  const { data: changes, isLoading: changesLoading } = useSubscriptionChanges(subId ? Number(subId) : null);

  const sortedPlans = useMemo(() => {
    return plans ? [...plans].sort((a, b) => a.sort_order - b.sort_order) : [];
  }, [plans]);

  const handleUpgrade = (plan: Plan) => {
    if (!subscription) return;
    upgradeMutation.mutate({ subscriptionId: Number(subscription.id), to_plan_id: plan.id });
  };

  const handleDowngrade = (plan: Plan, effective: 'immediate' | 'end_of_period') => {
    if (!subscription) return;
    downgradeMutation.mutate(
      { subscriptionId: Number(subscription.id), to_plan_id: plan.id, effective },
      { onSuccess: () => setDowngradePlan(null) },
    );
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Building2 className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-1">No plan selected</h2>
        <p className="text-sm mb-6">You haven't chosen a subscription plan yet.</p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ONBOARDING)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Choose a plan
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_STYLES[subscription.status] || STATUS_STYLES.active;
  const currentPlanSortOrder = currentPlan?.sort_order ?? 0;

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'plans' && (
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
                  <>
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span className="text-sm">Setup fee paid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    <span className="text-sm">Setup fee pending</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : sortedPlans.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {sortedPlans.map((plan, index) => {
                const action = getPlanAction(plan, subscription, currentPlanSortOrder);
                const price = Number(plan.price_monthly);
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

                    {plan.is_popular && action.type !== 'current' && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                          <Sparkles className="w-3 h-3" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className={cn('space-y-4 flex flex-col flex-1', plan.is_popular && action.type !== 'current' && 'pt-2')}>
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
                            <span className="text-sm text-gray-400 font-medium">/mo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 border-t border-gray-100 pt-4 space-y-3">
                        {features.map(([key]) => (
                          <div key={key} className="flex items-start gap-2.5">
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${accent.check}`} />
                            <span className="text-sm font-medium text-gray-700">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </div>
                        ))}
                        {limits.length > 0 && (
                          <div className="border-t border-gray-50 pt-3 mt-3 space-y-1.5">
                            {limits.map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between text-xs text-gray-400">
                                <span>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                <span className="font-semibold text-gray-600">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {action.type === 'current' && (
                        <span className="mt-4 text-center text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-2 rounded-xl">
                          Current Plan
                        </span>
                      )}

                      {action.type === 'subscribe' && (
                        <button
                          type="button"
                          onClick={() => navigate(ROUTES.ONBOARDING)}
                          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
                        >
                          Subscribe
                        </button>
                      )}

                      {action.type === 'upgrade' && (
                        <button
                          type="button"
                          disabled={upgradeMutation.isPending}
                          onClick={() => handleUpgrade(plan)}
                          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                          {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade'}
                        </button>
                      )}

                      {action.type === 'downgrade' && (
                        downgradePlan?.id === plan.id ? (
                          <div className="mt-4 space-y-2">
                            <button
                              type="button"
                              disabled={downgradeMutation.isPending}
                              onClick={() => handleDowngrade(plan, 'immediate')}
                              className="w-full bg-amber-500 text-white text-sm font-semibold py-2 px-4 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                              Downgrade Now
                            </button>
                            <button
                              type="button"
                              disabled={downgradeMutation.isPending}
                              onClick={() => handleDowngrade(plan, 'end_of_period')}
                              className="w-full bg-white text-gray-700 text-sm font-medium py-2 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              Schedule Downgrade
                            </button>
                            <button
                              type="button"
                              onClick={() => setDowngradePlan(null)}
                              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDowngradePlan(plan)}
                            className="mt-4 w-full bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all"
                          >
                            Downgrade
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h3>
          {paymentsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {payments.map(payment => {
                const StatusIcon = payment.status === 'completed' ? CheckCircle : payment.status === 'failed' ? XCircle : Clock;
                return (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: payment.currency || 'UGX', maximumFractionDigits: 0 }).format(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                      {payment.description && (
                        <p className="text-xs text-gray-400">{payment.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium capitalize"
                      style={{ color: payment.status === 'completed' ? '#16a34a' : payment.status === 'failed' ? '#dc2626' : '#d97706' }}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{payment.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No payment records found.</p>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Changes</h3>
          {changesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : changes && changes.length > 0 ? (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {changes.map((change: Record<string, unknown>) => {
                const status = change.status as string;
                const changeType = change.change_type as string;
                const effectiveAt = change.effective_at as string;
                const createdAt = change.created_at as string;

                return (
                  <div key={change.id as number} className="relative">
                    <div className={cn(
                      'absolute -left-5 mt-1.5 w-2.5 h-2.5 rounded-full border-2',
                      status === 'applied' ? 'bg-green-500 border-green-200'
                        : status === 'pending' ? 'bg-amber-500 border-amber-200'
                        : 'bg-gray-400 border-gray-200',
                    )} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {changeType === 'upgrade' && <><ArrowUp className="w-3.5 h-3.5 inline text-green-600 mr-1" />Upgrade</>}
                          {changeType === 'downgrade' && <><ArrowDown className="w-3.5 h-3.5 inline text-amber-600 mr-1" />Downgrade</>}
                          {changeType === 'cancel' && <><XCircle className="w-3.5 h-3.5 inline text-red-500 mr-1" />Cancellation</>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {changeType !== 'cancel' && (
                            <>From <span className="font-medium">{(change as Record<string, { name?: string }>).from_plan?.name || 'Unknown'}</span> → <span className="font-medium">{(change as Record<string, { name?: string }>).to_plan?.name || 'Unknown'}</span></>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          status === 'applied' ? 'bg-green-100 text-green-700'
                            : status === 'pending' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500',
                        )}>
                          {status === 'applied' ? 'Applied' : status === 'pending' ? 'Scheduled' : 'Cancelled'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {status === 'pending'
                            ? `Effective ${new Date(effectiveAt).toLocaleDateString()}`
                            : `Created ${new Date(createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No plan changes recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}