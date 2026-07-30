import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Package, FileSpreadsheet, Receipt, BookOpen, FileText, CreditCard, Loader2, ShoppingBag, Clock, ArrowRight, Zap } from 'lucide-react';
import { useAvailableModules, useMySubscriptions, useSubscribe, useCancelSubscription, useInitiatePayment } from './hooks/usePersonalSubscriptions';
import type { PersonalModule, MySubscription } from './hooks/usePersonalSubscriptions';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useToast } from '../../app/contexts/useToast';
import { ROUTES } from '../../app/routes/constants/shared.paths';

const MODULE_ICONS: Record<string, typeof Package> = {
  pipeline: Package,
  estimates: FileSpreadsheet,
  expenses: Receipt,
  accounting: BookOpen,
  documents: FileText,
};

const MODULE_PAGE_ROUTES: Record<string, string> = {
  pipeline: ROUTES.PIPELINE.BOARDS,
  estimates: ROUTES.ESTIMATES.INDEX,
  expenses: ROUTES.EXPENSES.LIST,
  accounting: ROUTES.ACCOUNTING.RATIOS,
  documents: ROUTES.DOCUMENTS.INDEX,
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

const TOOL_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  pipeline: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-200' },
  estimates: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
  expenses: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
  accounting: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
  documents: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
};

function ActiveToolCard({ sub, onCancel, cancelling }: { sub: MySubscription; onCancel: () => void; cancelling: boolean }) {
  const navigate = useNavigate();
  const Icon = MODULE_ICONS[sub.module_slug] ?? Package;
  const colors = TOOL_COLORS[sub.module_slug] ?? { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-200' };
  const expiry = daysUntil(sub.current_period_end);
  const isExpired = expiry === 'Expired';
  const route = MODULE_PAGE_ROUTES[sub.module_slug];

  return (
    <div className={`rounded-xl border-2 ${isExpired ? 'border-red-200 bg-red-50' : colors.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isExpired ? 'bg-red-100' : colors.bg}`}>
            <Icon className={`h-6 w-6 ${isExpired ? 'text-red-500' : colors.icon}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 capitalize">{sub.module_slug}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
              <span>${sub.price_usd}<span className="text-xs">/mo</span></span>
              <span className="text-gray-300">·</span>
              <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500 font-medium' : expiry.startsWith('Expires in') ? 'text-amber-500' : 'text-gray-400'}`}>
                <Clock className="h-3.5 w-3.5" />
                {expiry}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {route && !isExpired && (
            <button
              type="button"
              onClick={() => navigate(route)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Open <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? '...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreCard({
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
  const colors = TOOL_COLORS[module.slug] ?? { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-200' };
  const isActive = subscription?.status === 'active';

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`h-5 w-5 ${colors.icon}`} />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{module.label}</h3>
      <p className="mt-1 flex-1 text-xs text-gray-500">{module.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm font-bold text-gray-900">${module.price_monthly_usd}<span className="text-xs font-normal text-gray-400">/mo</span></span>
        {isActive ? (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
            <Package className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            disabled={subscribing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {subscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Add tool
          </button>
        )}
      </div>
    </div>
  );
}

export default function YourToolsPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { data: availableModules, isLoading: loadingModules } = useAvailableModules();
  const { data: mySubs, isLoading: loadingMine } = useMySubscriptions();
  const subscribe = useSubscribe();
  const cancelSub = useCancelSubscription();
  const initiatePayment = useInitiatePayment();
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

  const handlePay = async () => {
    try {
      const result = await initiatePayment.mutateAsync();
      success(`Payment of $${result.payment.amount} completed (ID: #${result.payment.id})`);
    } catch (e: any) {
      toastError(e?.response?.data?.message ?? 'Payment failed');
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Tools</h1>
        <p className="mt-1 text-sm text-gray-500">
          Subscribe to tools you need — <strong>$5/mo</strong> each. Get <strong>2+ tools</strong> and save <strong>20%</strong>.
        </p>
      </header>

      {/* Active Tools */}
      {activeCount > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Package className="h-5 w-5 text-blue-500" />
              Active Tools ({activeCount})
            </h2>
            <span className="text-sm text-gray-500">
              ${discountedTotal.toFixed(2)}<span className="text-xs">/mo total</span>
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {mySubs?.subscriptions.map((sub) => (
              <ActiveToolCard
                key={sub.id}
                sub={sub}
                onCancel={() => handleCancel(sub)}
                cancelling={cancellingId === sub.id}
              />
            ))}
          </div>

          {hasBundle && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-800">
                Bundle discount: <strong>{activeCount} tools</strong> × $5 = ${totalBeforeDiscount.toFixed(2)}
                <span className="mx-1">→</span>
                <strong className="text-blue-700">${discountedTotal.toFixed(2)}/mo</strong>
                <span className="ml-1 text-xs">(20% off)</span>
              </p>
            </div>
          )}

          {/* Pay bar */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs text-gray-500">Outstanding balance</p>
              <p className="text-xl font-bold text-gray-900">${discountedTotal.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={initiatePayment.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {initiatePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pay now
            </button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeCount === 0 && (
        <section className="mb-12 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900">No tools yet</h2>
          <p className="mt-1 text-sm text-gray-500">Pick the tools you need below to get started.</p>
        </section>
      )}

      {/* Tool Store */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Tool Store</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableModules?.map((mod) => (
            <StoreCard
              key={mod.slug}
              module={mod}
              subscription={subscriptionMap.get(mod.slug)}
              onSubscribe={() => handleSubscribe(mod.slug)}
              subscribing={subscribingSlug === mod.slug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
