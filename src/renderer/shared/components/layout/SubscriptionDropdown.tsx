import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';
import {
  Crown, Sparkles, Building2, CheckCircle2, ChevronDown,
  CreditCard, Settings, ArrowUp, ArrowDown,
} from 'lucide-react';

const PLAN_META: Record<string, { icon: typeof Crown; colors: { bg: string; ring: string; text: string } }> = {
  essential: { icon: Crown, colors: { bg: 'bg-blue-50', ring: 'ring-blue-200', text: 'text-blue-700' } },
  professional: { icon: Sparkles, colors: { bg: 'bg-indigo-50', ring: 'ring-indigo-200', text: 'text-indigo-700' } },
  enterprise: { icon: Building2, colors: { bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700' } },
};

function getPlanMeta(slug?: string | null) {
  return PLAN_META[slug ?? ''] ?? { icon: Sparkles, colors: { bg: 'bg-blue-50', ring: 'ring-blue-200', text: 'text-blue-700' } };
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const FEATURE_LABELS: Record<string, string> = {
  sales: 'Point of Sale',
  inventory: 'Inventory Management',
  customers: 'Customer Management',
  expenses: 'Expense Tracking',
  dashboard: 'Dashboard & Analytics',
  pipeline: 'Sales Pipeline',
  estimates: 'Estimates & Projects',
  storefront: 'Online Storefront',
  marketplace: 'Supply Marketplace',
};

export default function SubscriptionDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = useAppSelector((s) => s.auth.user);
  const plans = useAppSelector((s) => s.auth.plans);
  const subscription = user?.business?.subscription;

  const currentPlan = useMemo(() => {
    if (!plans || !subscription) return null;
    return plans.find((p) => p.id === subscription.plan_id) ?? null;
  }, [plans, subscription]);

  const sortedPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans].sort((a, b) => a.sort_order - b.sort_order);
  }, [plans]);

  const otherPlans = useMemo(() => {
    if (!currentPlan || !subscription) return [];
    return sortedPlans
      .filter((p) => p.id !== currentPlan.id)
      .map((p) => ({
        plan: p,
        slug: p.slug,
        isHigher: p.sort_order > currentPlan.sort_order,
        isLower: p.sort_order < currentPlan.sort_order,
      }))
      .slice(0, 3);
  }, [sortedPlans, currentPlan, subscription]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentSlug = currentPlan?.slug ?? subscription?.plan_slug;
  const meta = getPlanMeta(currentSlug);
  const Icon = meta.icon;

  const statusLabel = subscription?.status === 'trial' ? `Trial till ${formatDate(subscription.trial_ends_at)}`
    : subscription?.next_billing_date ? `Active till ${formatDate(subscription.next_billing_date)}`
    : subscription?.status === 'past_due' ? 'Payment due'
    : subscription?.status === 'active' ? 'Active'
    : subscription?.status ?? '';

  const features = useMemo(() => {
    const fts = currentPlan?.features ?? subscription?.plan_features;
    if (!fts) return [];
    return Object.entries(fts)
      .filter(([, v]) => v)
      .map(([k]) => FEATURE_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .slice(0, 5);
  }, [currentPlan, subscription?.plan_features]);

  if (!subscription) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate(ROUTES.ONBOARDING)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1 ring-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-amber-300 bg-amber-100 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="hidden lg:block min-w-0 max-w-[140px]">
            <span className="text-xs font-semibold truncate block text-amber-700">Choose a plan</span>
            <span className="block text-xs truncate text-gray-500">Get started</span>
          </div>
          <ChevronDown className="hidden lg:block w-3 h-3 ml-auto shrink-0 text-amber-400" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 lg:gap-2 lg:px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition-colors',
          open ? 'bg-gray-100 ring-gray-300' : 'bg-white ring-gray-200 hover:bg-gray-50',
        )}
      >
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center ring-1 shrink-0', meta.colors.ring, meta.colors.bg)}>
          <Icon className={cn('w-3.5 h-3.5', meta.colors.text)} />
        </div>
        {currentSlug && (
          <span className="lg:hidden text-xs font-semibold text-gray-900">
            {currentSlug.slice(0, 1).toUpperCase()}{currentSlug.slice(1, 3)}
          </span>
        )}
        <div className="hidden lg:block min-w-0 max-w-[140px]">
          <span className="text-xs font-semibold truncate block text-gray-900">{currentPlan?.name ?? subscription?.plan_name ?? 'Essential'}</span>
          <span className="block text-xs truncate text-gray-500">{statusLabel}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 transition-transform shrink-0 text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center ring-2', meta.colors.ring, meta.colors.bg)}>
                <Icon className={cn('w-5 h-5', meta.colors.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold truncate text-gray-900">{currentPlan?.name ?? subscription?.plan_name ?? 'Essential'}</span>
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-bold rounded-full shrink-0',
                    subscription.status === 'trial' ? 'bg-amber-100 text-amber-800'
                      : subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800',
                  )}>
                    {subscription.status === 'trial' ? 'Trial'
                      : subscription.status === 'past_due' ? 'Past due'
                      : subscription.status === 'active' ? 'Active'
                      : subscription.status ?? 'Active'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{statusLabel}</span>
              </div>
            </div>

            {features.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', meta.colors.text)} />
                    <span className="text-xs text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {otherPlans.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-medium mb-2 px-1 text-gray-500">Other plans</p>
              <div className="space-y-1">
                {otherPlans.map(({ plan: p, slug, isHigher, isLower }) => {
                  const pc = getPlanMeta(slug);
                  const PIcon = pc.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { navigate(ROUTES.SETTINGS.SUBSCRIPTION); setOpen(false); }}
                      className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-gray-50 cursor-pointer"
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center ring-1 shrink-0', pc.colors.ring, pc.colors.bg)}>
                        <PIcon className={cn('w-4 h-4', pc.colors.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate text-gray-900">{p.name}</span>
                          <span className="text-xs shrink-0 text-gray-500">
                            {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(Number(p.price_monthly))}/mo
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">View plan</span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isHigher && <ArrowUp className="w-3 h-3 text-blue-500" />}
                        {isLower && <ArrowDown className="w-3 h-3 text-amber-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-2 bg-gray-50/50 space-y-1">
            <button
              type="button"
              onClick={() => { navigate(ROUTES.SETTINGS.SUBSCRIPTION); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 cursor-pointer text-gray-700"
            >
              <Settings className="w-4 h-4" />
              <span>Manage subscription</span>
            </button>
            <button
              type="button"
              onClick={() => { navigate(ROUTES.SETTINGS.SUBSCRIPTION); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 cursor-pointer text-gray-700"
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment history</span>
            </button>
            <button
              type="button"
              onClick={() => { navigate(ROUTES.ONBOARDING); setOpen(false); }}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs hover:text-gray-900 cursor-pointer text-gray-500"
            >
              Compare all features
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
