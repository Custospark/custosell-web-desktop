import { useState } from 'react';
import { Package, FileSpreadsheet, Receipt, BookOpen, FileText, CreditCard, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAvailableModules, useMySubscriptions, useSubscribe, useCancelSubscription, useInitiatePayment } from './hooks/usePersonalSubscriptions';
import type { PersonalModule, MySubscription } from './hooks/usePersonalSubscriptions';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useToast } from '../../shared/hooks/useToast';

const MODULE_ICONS: Record<string, typeof Package> = {
  pipeline: Package,
  estimates: FileSpreadsheet,
  expenses: Receipt,
  accounting: BookOpen,
  documents: FileText,
};

function ModuleCard({
  module,
  subscription,
  onSubscribe,
  onCancel,
  subscribing,
  cancelling,
}: {
  module: PersonalModule;
  subscription?: MySubscription;
  onSubscribe: () => void;
  onCancel: () => void;
  subscribing: boolean;
  cancelling: boolean;
}) {
  const Icon = MODULE_ICONS[module.slug] ?? Package;
  const isActive = subscription?.status === 'active';

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{module.label}</h3>
      <p className="mt-1 flex-1 text-xs text-gray-500">{module.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">${module.price_monthly_usd}<span className="text-xs font-normal text-gray-500">/mo</span></span>
        {isActive ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle className="h-3.5 w-3.5" /> Active
            </span>
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? '...' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            disabled={subscribing}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {subscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Add — ${module.price_monthly_usd}
          </button>
        )}
      </div>
    </div>
  );
}

function PaymentBar({ total, hasPendingPayments }: { total: number; hasPendingPayments: boolean }) {
  const { success } = useToast();
  const initiatePayment = useInitiatePayment();

  const handlePay = async () => {
    try {
      const result = await initiatePayment.mutateAsync();
      success(`Payment of $${result.payment.amount} initiated (ID: #${result.payment.id})`);
    } catch {
      // error handled by the mutation
    }
  };

  if (total <= 0) return null;

  return (
    <div className="sticky bottom-0 mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Total monthly</p>
          <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
          {hasPendingPayments && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" /> Pending payment
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={initiatePayment.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {initiatePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Pay ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

export default function PersonalModulesPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { success, error: toastError } = useToast();
  const { data: availableModules, isLoading: loadingModules } = useAvailableModules();
  const { data: mySubs, isLoading: loadingMine } = useMySubscriptions();
  const subscribe = useSubscribe();
  const cancelSub = useCancelSubscription();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const subscriptionMap = new Map<string, MySubscription>();
  mySubs?.subscriptions.forEach((s) => subscriptionMap.set(s.module_slug, s));

  const totalMonthly = mySubs?.total_monthly_usd ?? 0;
  const hasPendingPayments = false;

  const handleSubscribe = async (moduleSlug: string) => {
    setSubscribingSlug(moduleSlug);
    try {
      await subscribe.mutateAsync({ module_slug: moduleSlug });
      success(`Subscribed to ${moduleSlug}!`);
    } catch (e: any) {
      toastError(e?.response?.data?.message ?? 'Failed to subscribe');
    } finally {
      setSubscribingSlug(null);
    }
  };

  const handleCancel = async (sub: MySubscription) => {
    setCancellingId(sub.id);
    try {
      await cancelSub.mutateAsync(sub.id);
      success('Subscription cancelled.');
    } catch {
      toastError('Failed to cancel subscription');
    } finally {
      setCancellingId(null);
    }
  };

  if (loadingModules || loadingMine) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Modules</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick the modules you need. <strong>$5/mo</strong> each. Pay once, use for the month.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableModules?.map((mod) => (
          <ModuleCard
            key={mod.slug}
            module={mod}
            subscription={subscriptionMap.get(mod.slug)}
            onSubscribe={() => handleSubscribe(mod.slug)}
            onCancel={() => {
              const sub = subscriptionMap.get(mod.slug);
              if (sub) handleCancel(sub);
            }}
            subscribing={subscribingSlug === mod.slug}
            cancelling={cancellingId === subscriptionMap.get(mod.slug)?.id}
          />
        ))}
      </div>

      {mySubs && mySubs.subscriptions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Active Subscriptions</h2>
          <div className="divide-y rounded-xl border border-gray-200 bg-white">
            {mySubs.subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 capitalize">{sub.module_slug}</span>
                  <span className="text-xs text-gray-400">${sub.price_usd}/mo</span>
                </div>
                <span className="text-xs text-gray-500 capitalize">{sub.billing_cycle}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentBar total={totalMonthly} hasPendingPayments={hasPendingPayments} />
    </div>
  );
}
