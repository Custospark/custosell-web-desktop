import { useMemo, useState } from 'react';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { useDowngrade, useCancelScheduledChange, useSubscriptionChanges, useChangeBillingCycle, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { useAppSelector } from '../../app/store/hooks/useApp';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import UpgradeFlowModal from './UpgradeFlowModal';
import BillingCyclePaymentModal from './BillingCyclePaymentModal';
import { getPaymentType } from './planActionMatrix';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import type { PlanAction } from './planActionMatrix';
import { CheckCircle, AlertCircle, Clock, CalendarDays } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useDisplayPrices } from '../../shared/utils/useDisplayPrices';
import { FEATURE_CATALOG, LIMIT_LABELS, STATUS_STYLES } from './planConstants';
import PlanCard from './PlanCard';

interface SubscriptionPaymentState {
  planName: string;
  planPrice: number;
  billingCycle: string;
  amount: number;
  actionLabel: string;
  paymentType: string;
}

interface PlansTabProps {
  subscription: SubscriptionInfo;
  onUpgradeComplete?: () => Promise<void>;
}

interface PendingPayment {
  plan: Plan;
  action: PlanAction;
  amount: number;
}

export default function PlansTab({ subscription, onUpgradeComplete }: PlansTabProps) {
  const userPhone = useAppSelector((s) => s.auth.user?.business?.phone || s.auth.user?.phone || '');
  const { currency, monthlyPrice, yearlyPrice, onboardingFee } = useDisplayPrices();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pendingCycle, setPendingCycle] = useState<'monthly' | 'yearly' | null>(null);
  const [downgradePlan, setDowngradePlan] = useState<Plan | null>(null);
  const [billingCyclePaymentQuote, setBillingCyclePaymentQuote] = useState<{
    proration: Record<string, unknown>;
    billing_cycle: string;
  } | null>(null);
  const [downgradeConfirmed, setDowngradeConfirmed] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [subscriptionPayment, setSubscriptionPayment] = useState<SubscriptionPaymentState | null>(null);
  const [upgradeFlowPlan, setUpgradeFlowPlan] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const downgradeMutation = useDowngrade();
  const cancelChangeMutation = useCancelScheduledChange();
  const changeBillingCycleMutation = useChangeBillingCycle();
  const { data: changes } = useSubscriptionChanges(Number(subscription.id));
  const pendingChange = useMemo(() => {
    if (!changes) return null;
    const pending = changes.find((c: Record<string, unknown>) => c.status === 'pending');
    return pending ?? null;
  }, [changes]);

  const user = useAppSelector((s) => s.auth.user);
  const { data: plans, isLoading: plansLoading } = useActivePlans();

  const sortedPlans = useMemo(() => {
    if (!plans) return [];
    const filtered = user?.account_type === 'personal'
      ? plans.filter((p) => p.type === 'personal' || p.type === 'business')
      : plans.filter((p) => p.type !== 'personal');
    return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  }, [plans, user?.account_type]);

  const currentPlan = sortedPlans.find(p => p.id === subscription.plan_id) ?? null;

  const relevantFeatures = useMemo(() => {
    const keys = new Set<string>();
    for (const plan of sortedPlans) {
      for (const key of Object.keys(plan.features ?? {})) {
        keys.add(key);
      }
    }
    return Object.entries(FEATURE_CATALOG).filter(([key]) => keys.has(key));
  }, [sortedPlans]);

  const relevantLimits = useMemo(() => {
    const keys = new Set<string>();
    for (const plan of sortedPlans) {
      for (const key of Object.keys(plan.limits ?? {})) {
        keys.add(key);
      }
    }
    return Object.entries(LIMIT_LABELS).filter(([key]) => keys.has(key));
  }, [sortedPlans]);
  const currentPlanSortOrder = currentPlan?.sort_order ?? 0;

  const getPaymentMetadata = (action: PlanAction, plan: Plan): Record<string, unknown> | undefined => {
    if (action.type === 'upgrade') {
      return { action: 'upgrade', to_plan_id: plan.id };
    }
    if (action.type === 'subscribe' || action.type === 'resubscribe') {
      return { action: 'subscribe', plan_id: plan.id };
    }
    return undefined;
  };

  const handleAction = (plan: Plan, action: PlanAction) => {
    if (!action.requiresPayment) {
      if (action.type === 'downgrade') {
        setDowngradePlan(plan);
        setDowngradeConfirmed(false);
      }
      return;
    }
    if (action.type === 'upgrade') {
      setUpgradeFlowPlan(plan);
      return;
    }
    const paymentCurrency = getPaymentCurrency();
    const isYearly = billingCycle === 'yearly';
    const amount = paymentCurrency === 'USD'
      ? (isYearly ? Number(plan.price_yearly_usd ?? 0) : Number(plan.price_monthly_usd ?? 0))
      : (isYearly ? yearlyPrice(plan) : monthlyPrice(plan));
    const paymentType = getPaymentType(action.type);
    setPendingPayment({ plan, action, amount });
    setSubscriptionPayment({
      planName: plan.name,
      planPrice: amount,
      billingCycle,
      amount,
      actionLabel: action.label,
      paymentType,
    });
  };

  const handlePaymentComplete = async () => {
    setRefreshing(true);
    try {
      await onUpgradeComplete?.();
    } finally {
      setRefreshing(false);
      setSubscriptionPayment(null);
      setPendingPayment(null);
    }
  };

  const handleDowngradeAction = (plan: Plan) => {
    downgradeMutation.mutate(
      { subscriptionId: Number(subscription.id), to_plan_id: plan.id, effective: 'end_of_period' },
      { onSuccess: () => { setDowngradePlan(null); setDowngradeConfirmed(false); } },
    );
  };

  const closePaymentModal = () => {
    setSubscriptionPayment(null);
    setPendingPayment(null);
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

        {subscription.payment_action?.required && subscription.payment_action.message && (
          <div className="mt-4 bg-white/15 backdrop-blur rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-200" />
            <p className="text-sm text-white font-medium">{subscription.payment_action.message}</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              if (subscription.billing_cycle === 'monthly') return;
              if (subscription.billing_cycle) {
                setPendingCycle('monthly');
              } else {
                setBillingCycle('monthly');
              }
            }}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
              billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              if (subscription.billing_cycle === 'yearly') return;
              if (subscription.billing_cycle) {
                setPendingCycle('yearly');
              } else {
                setBillingCycle('yearly');
              }
            }}
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
        <div className="flex flex-wrap justify-center gap-5">
          {sortedPlans.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} index={index} billingCycle={billingCycle} currency={currency} onboardingFee={onboardingFee} monthlyPriceFn={monthlyPrice} yearlyPriceFn={yearlyPrice} subscription={subscription} currentPlan={currentPlan} currentPlanSortOrder={currentPlanSortOrder} downgradePlan={downgradePlan} downgradeConfirmed={downgradeConfirmed} downgradeMutation={downgradeMutation} handleAction={handleAction} handleDowngradeAction={handleDowngradeAction} setDowngradePlan={setDowngradePlan} setDowngradeConfirmed={setDowngradeConfirmed} pendingChange={pendingChange} cancelChangeLoading={cancelChangeMutation.isPending} onCancelScheduledChange={() => cancelChangeMutation.mutate({ subscriptionId: Number(subscription.id) })} />
          ))}
        </div>
      )}



      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 sm:p-8 overflow-x-auto">
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Feature Comparison</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Feature</th>
              {sortedPlans.map((p) => (
                <th key={p.id} className="text-center py-3 px-2 font-semibold text-blue-600">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relevantFeatures.map(([key, { label }]) => (
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
            {relevantLimits.map(([key, label]) => (
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

      {pendingCycle && !billingCyclePaymentQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Switch to {pendingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Billing?</h3>
            <p className="text-sm text-gray-600">
              {pendingCycle === 'yearly'
                ? 'You\'ll be charged the yearly rate immediately, with credit applied for unused days in your current month.'
                : 'This change will take effect at the end of your current billing period.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingCycle(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  changeBillingCycleMutation.mutate(
                    { subscriptionId: Number(subscription.id), billing_cycle: pendingCycle },
                    {
                      onSuccess: (data) => {
                        if (data?.payment_required) {
                          setBillingCyclePaymentQuote({
                            proration: (data as Record<string, unknown>).proration as Record<string, unknown>,
                            billing_cycle: pendingCycle,
                          });
                        } else {
                          setBillingCycle(pendingCycle);
                          setPendingCycle(null);
                        }
                      },
                      onError: () => setPendingCycle(null),
                    },
                  );
                }}
                disabled={changeBillingCycleMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {changeBillingCycleMutation.isPending ? 'Checking...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {billingCyclePaymentQuote && (
        <BillingCyclePaymentModal
          proration={billingCyclePaymentQuote.proration}
          billingCycle={billingCyclePaymentQuote.billing_cycle}
          userPhone={userPhone}
          onClose={() => { setBillingCyclePaymentQuote(null); setPendingCycle(null); }}
          onComplete={async () => {
            setBillingCyclePaymentQuote(null);
            setPendingCycle(null);
            await onUpgradeComplete?.();
          }}
        />
      )}

      {upgradeFlowPlan && (
        <UpgradeFlowModal
          plan={upgradeFlowPlan}
          subscription={subscription}
          billingCycle={billingCycle}
          currency={currency}
          userPhone={userPhone}
          onClose={() => setUpgradeFlowPlan(null)}
          onComplete={handlePaymentComplete}
        />
      )}

      {subscriptionPayment && pendingPayment && (
        <SubscriptionPaymentModal
          planName={subscriptionPayment.planName}
          planPrice={subscriptionPayment.planPrice}
          billingCycle={subscriptionPayment.billingCycle}
          amount={subscriptionPayment.amount}
          currency={currency}
          userPhone={userPhone}
          actionLabel={subscriptionPayment.actionLabel}
          paymentType={subscriptionPayment.paymentType}
          metadata={getPaymentMetadata(pendingPayment.action, pendingPayment.plan)}
          refreshing={refreshing}
          onClose={closePaymentModal}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
