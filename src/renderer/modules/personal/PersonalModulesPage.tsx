import { useState } from 'react';
import { Package, FileSpreadsheet, Receipt, BookOpen, FileText, CreditCard, CheckCircle, Loader2, AlertCircle, ShoppingBag, Clock } from 'lucide-react';
import { useAvailableModules, useMySubscriptions, useSubscribe, useCancelSubscription, useInitiatePayment } from './hooks/usePersonalSubscriptions';
import type { PersonalModule, MySubscription } from './hooks/usePersonalSubscriptions';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useToast } from '../../app/contexts/useToast';

const MODULE_ICONS: Record<string, typeof Package> = {
  pipeline: Package,
  estimates: FileSpreadsheet,
  expenses: Receipt,
  accounting: BookOpen,
  documents: FileText,
};

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Expired';
  if (diff === 0) return 'Expires today';
  if (diff === 1) return 'Expires in 1 day';
  if (diff <= 7) return `Expires in ${diff} days`;
  return `Renewal ${new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function ActiveToolRow({ sub, onCancel, cancelling }: { sub: MySubscription; onCancel: () => void; cancelling: boolean }) {
  const Icon = MODULE_ICONS[sub.module_slug] ?? Package;
  const expiry = daysUntil(sub.current_period_end);
  const isExpired = expiry === 'Expired';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 transition-colors hover:border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isExpired ? 'bg-red-50' : 'bg-green-50'}`}>
          <Icon className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-green-600'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 capitalize">{sub.module_slug}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>${sub.price_usd}/mo</span>
            <span className="text-gray-300">·</span>
            <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500' : expiry.startsWith('Expires in') ? 'text-amber-500' : 'text-gray-400'}`}>
              <Clock className="h-3 w-3" />
              {expiry}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {cancelling ? '...' : 'Cancel'}
      </button>
    </div>
  );
}

function ModuleCard({
  module,
  subscription,
  onSubscribe,
  subscribing,
}: {
  module: PersonalModule;
  subscription?: MySubscription;
  onSubscribe: () => void;
  subscribing: boolean;
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
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle className="h-3.5 w-3.5" /> Active
          </span>
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

function BundleNotice({ count, totalBeforeDiscount, discountedTotal }: { count: number; totalBeforeDiscount: number; discountedTotal: number }) {
  if (count < 2) return null;
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <p className="text-sm font-medium text-green-800">
        Bundle discount applied: <strong>{count} tools</strong> × $5 = ${totalBeforeDiscount.toFixed(2)}
        <span className="mx-1">→</span>
        <strong className="text-green-700">${discountedTotal.toFixed(2)}/mo</strong>
        <span className="ml-1 text-xs">(20% off)</span>
      </p>
    </div>
  );
}

function PaymentBar({ total }: { total: number }) {
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
          <p className="text-xs text-gray-500">Total per month</p>
          <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
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

export default function YourToolsPage() {
  const { success, error: toastError } = useToast();
  const { data: availableModules, isLoading: loadingModules } = useAvailableModules();
  const { data: mySubs, isLoading: loadingMine } = useMySubscriptions();
  const subscribe = useSubscribe();
  const cancelSub = useCancelSubscription();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const subscriptionMap = new Map<string, MySubscription>();
  mySubs?.subscriptions.forEach((s) => subscriptionMap.set(s.module_slug, s));

  const activeCount = mySubs?.subscriptions.length ?? 0;
  const totalBeforeDiscount = activeCount * 5;
  const hasBundle = activeCount >= 2;
  const discountedTotal = hasBundle ? totalBeforeDiscount * 0.8 : totalBeforeDiscount;

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
        <h1 className="text-2xl font-bold text-gray-900">Your Tools</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tools you subscribe to — <strong>$5/mo</strong> each. Get <strong>2+ tools</strong> and save <strong>20%</strong>.
        </p>
      </div>

      {/* Active tools */}
      {mySubs && mySubs.subscriptions.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Active Tools
          </h2>
          <div className="flex flex-col gap-2">
            {mySubs.subscriptions.map((sub) => (
              <ActiveToolRow
                key={sub.id}
                sub={sub}
                onCancel={() => handleCancel(sub)}
                cancelling={cancellingId === sub.id}
              />
            ))}
          </div>

          {activeCount > 0 && (
            <div className="mt-3">
              <BundleNotice
                count={activeCount}
                totalBeforeDiscount={totalBeforeDiscount}
                discountedTotal={discountedTotal}
              />
            </div>
          )}
        </section>
      )}

      {/* Empty state */}
      {mySubs && mySubs.subscriptions.length === 0 && (
        <section className="mb-10 rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900">No tools yet</h2>
          <p className="mt-1 text-sm text-gray-500">Pick the tools you need below to get started.</p>
        </section>
      )}

      {/* Tool Store */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShoppingBag className="h-5 w-5 text-blue-500" />
          Tool Store
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableModules?.map((mod) => (
            <ModuleCard
              key={mod.slug}
              module={mod}
              subscription={subscriptionMap.get(mod.slug)}
              onSubscribe={() => handleSubscribe(mod.slug)}
              subscribing={subscribingSlug === mod.slug}
            />
          ))}
        </div>
      </section>

      <PaymentBar total={discountedTotal} />
    </div>
  );
}
