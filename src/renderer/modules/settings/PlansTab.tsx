import { useMemo, useState } from 'react';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { useDowngrade, useCancelScheduledChange, useSubscriptionChanges, useChangeBillingCycle, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { useAppSelector } from '../../app/store/hooks/useApp';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import UpgradeFlowModal from './UpgradeFlowModal';
import BillingCyclePaymentModal from './BillingCyclePaymentModal';
import RenewTopUpModal from './RenewTopUpModal';
import { getPaymentType } from './planActionMatrix';
import type { Plan, PaymentType } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import type { PlanAction } from './planActionMatrix';
import { CheckCircle, AlertCircle, Clock, CalendarDays, Rocket } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useDisplayPrices } from '../../shared/utils/useDisplayPrices';
import { FEATURE_CATALOG, LIMIT_LABELS, STATUS_STYLES } from './planConstants';
import PlanCard from './PlanCard';
import PlanUsageSection from './ui/PlanUsageSection';
import BillingCycleSwitchModal from './ui/BillingCycleSwitchModal';
import PendingPaymentNotice from '../../shared/components/payments/PendingPaymentNotice';

interface SubscriptionPaymentState {
  planName: string;
  planPrice: number;
  billingCycle: string;
  amount: number;
  currency: string;
  actionLabel: string;
  paymentType: PaymentType;
}

interface PlansTabProps {
  subscription: SubscriptionInfo;
  onUpgradeComplete?: () => Promise<void>;
  /** Switch to the History tab (pending-payment guidance). */
  onGoToHistory?: () => void;
}

interface PendingPayment {
  plan: Plan;
  action: PlanAction;
  amount: number;
}

export default function PlansTab({ subscription, onUpgradeComplete, onGoToHistory }: PlansTabProps) {
  const userPhone = useAppSelector((s) => s.auth.user?.business?.phone || s.auth.user?.phone || '');
  const { currency, monthlyPrice, yearlyPrice, onboardingFee } = useDisplayPrices();

  const scrollToUpgradeToBusiness = () => {
    document.getElementById('upgrade-to-business')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
  const [topUp, setTopUp] = useState(false);
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

  const personalPlans = useMemo(() => sortedPlans.filter((p) => p.type === 'personal'), [sortedPlans]);
  const businessPlans = useMemo(() => sortedPlans.filter((p) => p.type === 'business'), [sortedPlans]);

  const currentPlan = sortedPlans.find(p => p.id === subscription.plan_id) ?? null;

  const comparisonPlans = useMemo(() => {
    return user?.account_type === 'personal'
      ? [...personalPlans, ...businessPlans]
      : businessPlans;
  }, [user?.account_type, personalPlans, businessPlans]);

  const relevantFeatures = useMemo(() => {
    const planList = comparisonPlans.length > 0 ? comparisonPlans : sortedPlans;
    const keys = new Set<string>();
    for (const plan of planList) {
      for (const key of Object.keys(plan.features ?? {})) {
        keys.add(key);
      }
    }
    // Order rows by how many BUSINESS plans include the feature, so a personal
    // account's comparison matches the business account layout exactly (most
    // commonly included features first). Mixing in personal plans would skew
    // the counts and produce a different, non-business ordering.
    const orderingSource = businessPlans.length > 0 ? businessPlans : planList;
    return Object.entries(FEATURE_CATALOG)
      .filter(([key]) => keys.has(key))
      .sort(([a], [b]) => {
        const countA = orderingSource.filter((p) => p.features?.[a] === true).length;
        const countB = orderingSource.filter((p) => p.features?.[b] === true).length;
        return countB - countA;
      });
  }, [comparisonPlans, sortedPlans, businessPlans]);

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
    if (action.type === 'upgrade' || action.type === 'reactivate') {
      return { action: action.type === 'upgrade' ? 'upgrade' : 'reactivate', to_plan_id: plan.id };
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
    if (action.type === 'renew_early') {
      setTopUp(true);
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
      currency: paymentCurrency,
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
            <h2 className="text-2xl font-bold">
              {plansLoading ? (
                <span className="inline-block h-7 w-40 animate-pulse rounded-lg bg-white/25" aria-hidden="true" />
              ) : (
                currentPlan?.name ?? 'Unknown Plan'
              )}
            </h2>
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
                : '-'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-100">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {subscription.next_billing_date
                ? `Next bill: ${new Date(subscription.next_billing_date).toLocaleDateString()}`
                : subscription.trial_ends_at
                  ? `Trial ends: ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                  : '-'}
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

        {subscription.status === 'active' && !subscription.payment_action?.required && currentPlan && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-sm text-white font-medium">
              All set - your {currentPlan.name} plan is active through{' '}
              {subscription.next_billing_date
                ? new Date(subscription.next_billing_date).toLocaleDateString()
                : 'your billing date'}
              .
            </p>
            <button
              type="button"
              onClick={() => setTopUp(true)}
              className="text-sm font-semibold bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Renew Early
            </button>
          </div>
        )}
      </div>

      {user?.account_type !== 'personal' && <PlanUsageSection plan={currentPlan} />}

      <PendingPaymentNotice onGoToHistory={onGoToHistory} />

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
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
          {user?.account_type === 'personal' && (
            <button
              type="button"
              onClick={scrollToUpgradeToBusiness}
              title="Jump to the business upgrade section below"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-indigo-100 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              Upgrade to Business
            </button>
          )}
        </div>
        {subscription.billing_cycle && billingCycle !== subscription.billing_cycle && (
          <button
            type="button"
            onClick={() => setPendingCycle(billingCycle)}
            className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Apply {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Billing
          </button>
        )}
      </div>

      {plansLoading ? (
        <CustosellLoader fullPage={false} />
      ) : user?.account_type === 'personal' ? (
        <>
          <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-5">
            {personalPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} index={0} billingCycle={billingCycle} currency={currency} onboardingFee={onboardingFee} monthlyPriceFn={monthlyPrice} yearlyPriceFn={yearlyPrice} subscription={subscription} currentPlan={currentPlan} currentPlanSortOrder={currentPlanSortOrder} downgradePlan={downgradePlan} downgradeConfirmed={downgradeConfirmed} downgradeMutation={downgradeMutation} handleAction={handleAction} handleDowngradeAction={handleDowngradeAction} setDowngradePlan={setDowngradePlan} setDowngradeConfirmed={setDowngradeConfirmed} pendingChange={pendingChange} cancelChangeLoading={cancelChangeMutation.isPending} onCancelScheduledChange={() => cancelChangeMutation.mutate({ subscriptionId: Number(subscription.id) })} />
            ))}
          </div>

          <div id="upgrade-to-business" className="rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-6 text-center scroll-mt-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upgrade Your Account to Business</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-lg mx-auto">
              Unlock sales, inventory, HR, forecasting, and more. Select a business plan below to upgrade your account and get access to all business features.
            </p>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">Business Plans</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {businessPlans.map((plan, index) => (
              <PlanCard key={plan.id} plan={plan} index={index} billingCycle={billingCycle} currency={currency} onboardingFee={onboardingFee} monthlyPriceFn={monthlyPrice} yearlyPriceFn={yearlyPrice} subscription={subscription} currentPlan={currentPlan} currentPlanSortOrder={currentPlanSortOrder} downgradePlan={downgradePlan} downgradeConfirmed={downgradeConfirmed} downgradeMutation={downgradeMutation} handleAction={handleAction} handleDowngradeAction={handleDowngradeAction} setDowngradePlan={setDowngradePlan} setDowngradeConfirmed={setDowngradeConfirmed} pendingChange={pendingChange} cancelChangeLoading={cancelChangeMutation.isPending} onCancelScheduledChange={() => cancelChangeMutation.mutate({ subscriptionId: Number(subscription.id) })} />
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
          {sortedPlans.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} index={index} billingCycle={billingCycle} currency={currency} onboardingFee={onboardingFee} monthlyPriceFn={monthlyPrice} yearlyPriceFn={yearlyPrice} subscription={subscription} currentPlan={currentPlan} currentPlanSortOrder={currentPlanSortOrder} downgradePlan={downgradePlan} downgradeConfirmed={downgradeConfirmed} downgradeMutation={downgradeMutation} handleAction={handleAction} handleDowngradeAction={handleDowngradeAction} setDowngradePlan={setDowngradePlan} setDowngradeConfirmed={setDowngradeConfirmed} pendingChange={pendingChange} cancelChangeLoading={cancelChangeMutation.isPending} onCancelScheduledChange={() => cancelChangeMutation.mutate({ subscriptionId: Number(subscription.id) })} />
          ))}
        </div>
      )}



      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 sm:p-8 overflow-x-auto">
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900">Feature Comparison</h2>
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Feature</th>
              {comparisonPlans.map((p) => (
                <th key={p.id} className="text-center py-3 px-2 font-semibold text-blue-600">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relevantFeatures.map(([key, { label }]) => (
              <tr key={key} className="border-b border-gray-100 odd:bg-gray-50/50">
                <td className="py-2.5 px-2 font-medium text-gray-700">{label}</td>
                {comparisonPlans.map((p) => {
                  const has = p.features?.[key] === true;
                  return (
                    <td key={p.id} className={`text-center py-2.5 px-2 ${has ? 'text-blue-500 font-bold' : 'text-gray-300'}`}>
                      {has ? '✓' : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b border-gray-200">
              <td colSpan={comparisonPlans.length + 1} className="py-3 px-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Limits</span>
              </td>
            </tr>
            {relevantLimits.map(([key, label]) => (
              <tr key={key} className="border-b border-gray-100 odd:bg-gray-50/50">
                <td className="py-2.5 px-2 font-medium text-gray-700">{label}</td>
                {comparisonPlans.map((p) => {
                  const val = p.limits?.[key];
                  return (
                    <td key={p.id} className="text-center py-2.5 px-2 font-semibold text-gray-900">
                      {val === null || val === undefined ? '-' : Intl.NumberFormat('en-US').format(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingCycle && !billingCyclePaymentQuote && (
        <BillingCycleSwitchModal
          pendingCycle={pendingCycle}
          isPending={changeBillingCycleMutation.isPending}
          onCancel={() => setPendingCycle(null)}
          onConfirm={() => {
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
        />
      )}

      {billingCyclePaymentQuote && (
        <BillingCyclePaymentModal
          proration={billingCyclePaymentQuote.proration}
          billingCycle={billingCyclePaymentQuote.billing_cycle}
          currency={getPaymentCurrency()}
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
          currency={getPaymentCurrency()}
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
          currency={subscriptionPayment.currency}
          userPhone={userPhone}
          actionLabel={subscriptionPayment.actionLabel}
          paymentType={subscriptionPayment.paymentType}
          metadata={getPaymentMetadata(pendingPayment.action, pendingPayment.plan)}
          refreshing={refreshing}
          onClose={closePaymentModal}
          onComplete={handlePaymentComplete}
        />
      )}

      {topUp && currentPlan && (
        <RenewTopUpModal
          plan={currentPlan}
          subscription={subscription}
          userPhone={userPhone}
          onClose={() => setTopUp(false)}
          onComplete={async () => {
            setTopUp(false);
            await handlePaymentComplete();
          }}
        />
      )}
    </div>
  );
}
