import { useState, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, CreditCard, Rocket, ChevronDown, ChevronUp, Sparkles, Lock,
  Wallet, Kanban, FileText, FolderOpen, BookOpen,
} from 'lucide-react';
import type { ElementType } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { resolveAccessibleNavGroups } from '../../shared/components/layout/resolveAccessibleNavLeaves';
import { usePlanAccessibleModules } from '../../shared/utils/usePlanAccessibleModules';
import {
  BUSINESS_MODULE_SLUGS,
  MODULE_LABELS,
  MODULE_DEFAULT_ROUTES,
  getAccessibleModules,
  hasSubscriptionAccess,
} from '../../shared/utils/moduleAccess';

/** Icons for paid personal-plan tools that are locked while access lapses. */
const LOCKED_ICONS: Record<string, ElementType> = {
  expenses: Wallet,
  pipeline: Kanban,
  documents: FileText,
  estimates: FolderOpen,
  accounting: BookOpen,
};

interface Tool {
  key: string;
  label: string;
  description: string;
  icon: ElementType;
  to: string;
}

/** Group labels that are not "tools" to launch from the Get Started grid. */
const NON_TOOL_GROUPS = new Set(['Your Tools', 'Platform', 'Guide Settings']);

/** Preferred display order for the workspace tool cards; unlisted/default groups sort last. */
const TOOL_ORDER = [
  'Online Shopping',
  'Dashboard',
  'Sales',
  'Inventory & Supply Chain',
  'Customers',
  'Sales Funnel',
  'Projects & Estimates',
  'Income & Expenses',
  'Accounting',
  'Documents',
  'Forecasting',
  'HR & Payroll',
  'Custosell Guide',
  'Account',
  'Settings',
];

/** Personal-account voice — mirrors the register page's value-driven copy. */
const PERSONAL_DESCRIPTIONS: Record<string, string> = {
  'Online Shopping': 'Browse products and services from every business on Custosell and order them.',
  Sales: 'Manage personal sales and see your money flow — productive, even offline.',
  'Inventory & Supply Chain': 'Keep what you sell stocked and simple to find.',
  Customers: 'Look after the people you sell to and bring them back.',
  'Sales Funnel': 'Track personal projects and close the deals that matter to you.',
  'Projects & Estimates': 'Project Management — plan and estimate your ideas, even offline.',
  'Income & Expenses': 'Expense Tracking — record what you spend and earn to stay organised.',
  Accounting: 'Bookkeeping — keep your records neat and your numbers in balance.',
  Documents: 'Document Management — store and find your important files with ease.',
  Forecasting: 'Plan ahead and see where you are heading with confidence.',
  'HR & Payroll': 'Look after people, from their pay to their days off.',
  'Custosell Guide': 'Friendly tutorials, FAQs, feedback, and help when you need it.',
  Account: 'Your notifications, profile, and referral insights in one spot.',
  Settings: 'Make Custosell feel like yours — preferences and more.',
};

/** Business-account copy: business-and-warm tone. */
const BUSINESS_DESCRIPTIONS: Record<string, string> = {
  'Online Shopping': 'Browse and buy products from businesses across Custosell.',
  Dashboard: 'Your business at a glance — key numbers and activity, neatly set.',
  Sales: 'Process orders, track history, and handle refunds and shifts with ease.',
  'Inventory & Supply Chain': 'Keep products, stock, suppliers, and purchase orders in balance.',
  Customers: 'Build stronger relationships and serve every customer well.',
  'Sales Funnel': 'Manage leads and deals on a visual pipeline that keeps your team aligned.',
  'Projects & Estimates': 'Draft professional estimates and run projects your team can track.',
  'Income & Expenses': 'Record income, track expenses, and see your financial health clearly.',
  Accounting: 'Full double-entry accounting — chart of accounts, journals, trial balance, & P&L.',
  Documents: 'Store and organize your business files securely in the cloud.',
  Forecasting: 'Plan budgets, track KPIs, and model future scenarios with confidence.',
  'HR & Payroll': 'Manage people, departments, payroll, and company assets with care.',
  'Custosell Guide': 'Tutorials, FAQs, feedback, and help whenever your team needs it.',
  Account: 'Notifications, your profile, and referral insights for you.',
  Settings: 'Preferences, billing, and data & export — in full control.',
};

const TOOL_DESCRIPTIONS: Record<string, Record<string, string>> = {
  personal: PERSONAL_DESCRIPTIONS,
  business: BUSINESS_DESCRIPTIONS,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: 'Free trial', color: 'text-blue-700', bg: 'bg-blue-50' },
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-50' },
  past_due: { label: 'Needs payment', color: 'text-amber-700', bg: 'bg-amber-50' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-50' },
  suspended: { label: 'Suspended', color: 'text-gray-500', bg: 'bg-gray-50' },
};

/** Local state for the tools grid. "Show more" reveal and access gating use shared hasSubscriptionAccess(). */

export default function YourToolsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const planModules = usePlanAccessibleModules();
  const subscription = user?.business?.subscription;
  const status = subscription?.status ?? null;
  const config = status ? STATUS_CONFIG[status] : null;
  const activeAccess = hasSubscriptionAccess(subscription);
  const [showAll, setShowAll] = useState(false);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  const monthlyPriceUsd = Number(subscription?.price_monthly_usd) || 0;
  const priceLabel = monthlyPriceUsd > 0 ? `$${monthlyPriceUsd}` : null;

  const availableTools = useMemo(() => {
    const copy = user?.account_type === 'personal'
      ? TOOL_DESCRIPTIONS.personal
      : TOOL_DESCRIPTIONS.business;
    const groups = resolveAccessibleNavGroups(user, planModules).filter(
      (g) => !NON_TOOL_GROUPS.has(g.label) && copy[g.label],
    );
    const sorted = [...groups].sort((a, b) => {
      const ia = TOOL_ORDER.indexOf(a.label);
      const ib = TOOL_ORDER.indexOf(b.label);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted.map<Tool>((g) => ({
      key: g.label,
      label: g.label,
      description: copy[g.label],
      icon: g.icon,
      to: g.subItems[0].to,
    }));
  }, [user, planModules]);

  const visibleTools = availableTools.slice(0, 6);
  const hasMore = availableTools.length > 6;
  const hiddenCount = availableTools.length - 6;

  // Paid personal-plan tools the user currently has NO access to (lapsed/suspended).
  // Derived from the plan's granted features minus what is reachable right now.
  const lockedTools = useMemo(() => {
    if (activeAccess) return [];
    const accessible = new Set(getAccessibleModules(user));
    const features = user?.business?.subscription?.plan_features ?? {};
    const copy = user?.account_type === 'personal'
      ? TOOL_DESCRIPTIONS.personal
      : TOOL_DESCRIPTIONS.business;
    return Object.entries(features)
      .filter(([slug, enabled]) =>
        enabled
        && (BUSINESS_MODULE_SLUGS as readonly string[]).includes(slug)
        && !accessible.has(slug)
        && copy[MODULE_LABELS[slug as keyof typeof MODULE_LABELS]],
      )
      .map<Tool>(([slug]) => {
        const label = MODULE_LABELS[slug as keyof typeof MODULE_LABELS];
        return {
          key: slug,
          label,
          description: copy[label],
          icon: LOCKED_ICONS[slug] ?? Sparkles,
          to: MODULE_DEFAULT_ROUTES[slug],
        };
      })
      .sort((a, b) => {
        const ia = TOOL_ORDER.indexOf(a.label);
        const ib = TOOL_ORDER.indexOf(b.label);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
  }, [user, activeAccess]);

  const go = (to: string) => navigate(to);

  const renderStatusLine = () => {
    if (!subscription || !config) return null;
    if (status === 'trial' && subscription.trial_ends_at) {
      return `Free trial until ${new Date(subscription.trial_ends_at).toLocaleDateString()} — subscribe now to keep your tools`;
    }
    if (status === 'active') return 'Your Personal plan is active — all tools unlocked.';
    if (status === 'past_due' && activeAccess && subscription.grace_period_ends_at) {
      return `Payment overdue — access continues until ${new Date(subscription.grace_period_ends_at).toLocaleDateString()}. Subscribe to keep your tools.`;
    }
    if (status === 'past_due') return 'Payment overdue — restore access to unlock your tools.';
    if (status === 'suspended') return `Access suspended${priceLabel ? ` — restore at just ${priceLabel}/month` : ''}.`;
    if (status === 'cancelled') return 'Plan cancelled — choose a plan to continue.';
    if (status === 'expired') return 'Your trial has expired. Restore access to continue.';
    return `Plan is ${status}.`;
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-28 sm:pb-10">
      {!activeAccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <span className="text-sm font-medium text-amber-700">
            {status === 'suspended'
              ? `Your subscription has been suspended${priceLabel ? ` — restore access at just ${priceLabel}/month` : ''}.`
              : status === 'past_due'
                ? 'Payment overdue — restore access to unlock your tools.'
                : `No active plan${priceLabel ? ` — restore access at just ${priceLabel}/month` : ''}.`}
          </span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200 hover:bg-amber-50"
          >
            <CreditCard className="h-4 w-4" />
            {status === 'past_due' ? 'Pay now' : 'Restore access'}
          </button>
        </div>
      )}

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-600">Welcome back, {firstName} 👋</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your Tools</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Get started with any of these tools. Choose one below to jump straight in.
          </p>
        </div>
        {activeAccess && (
          <button
            type="button"
            onClick={() => go(ROUTES.SETTINGS.SUBSCRIPTION)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-indigo-700"
          >
            <CreditCard className="h-4 w-4" />
            Upgrade plan
          </button>
        )}
      </div>

      <section aria-label="Get started">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {activeAccess ? 'Get started with any of these' : 'Your always-available tools'}
          </h2>
        </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[520px]:gap-4 xl:grid-cols-3">
              {visibleTools.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => go(t.to)}
                  aria-label={`Open ${t.label}`}
                  className="group flex flex-col gap-2 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-4 text-left shadow-sm shadow-blue-100/60 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md hover:shadow-blue-200/70"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <t.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t.label}</span>
                  </div>
                  <p className="pl-10 text-xs leading-relaxed text-slate-500">{t.description}</p>
                </button>
              ))}

              {hasMore && !showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-slate-500 transition-all hover:border-blue-400 hover:text-blue-600"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">Show more</span>
                  <span className="text-xs text-slate-400">
                    {hiddenCount > 0 ? `${hiddenCount} more tools` : 'More tools'}
                  </span>
                </button>
              ) : null}
            </div>

            {showAll ? (
              <div className="mt-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[520px]:gap-4 xl:grid-cols-3">
                {availableTools.slice(6).map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => go(tool.to)}
                    aria-label={`Open ${tool.label}`}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <tool.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-bold text-slate-900">{tool.label}</span>
                    </div>
                    <p className="pl-10 text-xs leading-relaxed text-slate-500">{tool.description}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
                >
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </button>
              </div>
            ) : null}
          </section>

          {!activeAccess && lockedTools.length > 0 && (
            <section aria-label="Locked tools" className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-white">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Locked tools — reactivate to unlock
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  {priceLabel ? `Restore access at just ${priceLabel}/month` : 'Restore full access'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[520px]:gap-4 xl:grid-cols-3">
                {lockedTools.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
                    aria-label={`${t.label} — locked, restore access to use`}
                    className="flex cursor-not-allowed select-none flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                        <t.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-bold text-slate-600">{t.label}</span>
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Lock className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="pl-10 text-xs leading-relaxed text-slate-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </section>
          )} 

          {/* Bottom: plan / subscription info */}
          <div className="mt-8 space-y-4">
            {subscription && config ? (
              <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${config.bg}`}>
                {status === 'active' || status === 'trial' ? (
                  <CheckCircle className={`h-5 w-5 ${config.color}`} />
                ) : (
                  <AlertTriangle className={`h-5 w-5 ${config.color}`} />
                )}
                <span className={`text-sm font-medium ${config.color}`}>{renderStatusLine()}</span>
                {(status === 'past_due' || status === 'suspended' || status === 'expired' || status === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 hover:bg-blue-50"
                  >
                    <CreditCard className="h-4 w-4" />
                    {status === 'past_due' ? 'Pay now' : status === 'suspended' ? 'Reactivate' : 'Subscribe'}
                  </button>
                )}
                {status === 'trial' && (
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscribe Now
                  </button>
                )}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-md shadow-indigo-500/20">
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Go Unlimited — Upgrade to Business</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                      Get sales, inventory, HR, forecasting, and more. Start your free trial today.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-purple-700"
                >
                  <Rocket className="h-4 w-4" />
                  View Business Plans
                </button>
              </div>
            </div>
          </div>
    </div>
  );
}