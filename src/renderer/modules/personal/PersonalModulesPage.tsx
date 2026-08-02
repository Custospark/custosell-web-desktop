import { useState, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, CreditCard, Rocket, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import type { ElementType } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { resolveAccessibleNavGroups } from '../../shared/components/layout/resolveAccessibleNavLeaves';
import { usePlanAccessibleModules } from '../../shared/utils/usePlanAccessibleModules';

interface Tool {
  key: string;
  label: string;
  description: string;
  icon: ElementType;
  to: string;
}

/** Group labels that are not "tools" to launch from the Get Started grid. */
const NON_TOOL_GROUPS = new Set(['Your Tools', 'Online Shopping', 'Platform', 'Guide Settings']);

/** Preferred display order for the workspace tool cards; unlisted/default groups sort last. */
const TOOL_ORDER = [
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

/** Personal-account voice — warm, casual, self-focused. */
const PERSONAL_DESCRIPTIONS: Record<string, string> = {
  Dashboard: 'A friendly snapshot of what is happening with your money and tasks.',
  Sales: 'Keep tabs on your sales and see how your money moves.',
  'Inventory & Supply Chain': 'Keep what you sell stocked and easy to find.',
  Customers: 'Nurture the people you sell to and serve them well.',
  'Sales Funnel': 'Track your leads and close deals you care about.',
  'Projects & Estimates': 'Bring your ideas to life — estimate, plan, and team up.',
  'Income & Expenses': 'Watch what you earn and spend, all in one cozy place.',
  Accounting: 'Keep your records neat and your numbers in balance.',
  Documents: 'Store and find your important files with ease.',
  Forecasting: 'Take a peek at what your future might look like.',
  'HR & Payroll': 'Look after people, from their pay to their days off.',
  'Custosell Guide': 'Friendly tutorials, FAQs, feedback, and help when you need it.',
  Account: 'Your notifications, profile, and referral insights in one spot.',
  Settings: 'Make Custosell feel like yours — preferences and more.',
};

/** Business-account copy: business-and-warm tone. */
const BUSINESS_DESCRIPTIONS: Record<string, string> = {
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
  past_due: { label: 'Payment needed', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-50' },
  suspended: { label: 'Suspended', color: 'text-gray-500', bg: 'bg-gray-50' },
};

export default function YourToolsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const planModules = usePlanAccessibleModules();
  const subscription = user?.business?.subscription;
  const status = subscription?.status ?? null;
  const config = status ? STATUS_CONFIG[status] : null;
  const activeAccess = status === 'active' || status === 'trial';
  const [showAll, setShowAll] = useState(false);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

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

  const go = (to: string) => navigate(to);

  const renderStatusLine = () => {
    if (!subscription || !config) return null;
    if (status === 'trial' && subscription.trial_ends_at) {
      return `Free trial until ${new Date(subscription.trial_ends_at).toLocaleDateString()} — subscribe now to keep your tools`;
    }
    if (status === 'active') return 'Your Personal plan is active — all tools unlocked.';
    if (status === 'past_due') return 'Payment overdue. Subscribe to restore access to your tools.';
    if (status === 'suspended') return 'Your subscription has been suspended. Reactivate to regain access.';
    if (status === 'cancelled') return 'Your subscription has been cancelled. Choose a new plan to continue.';
    if (status === 'expired') return 'Your trial has expired. Subscribe to continue using your tools.';
    return `Plan is ${status}.`;
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-28 sm:pb-10">
      {activeAccess ? (
        <>
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Get started with any of these</h2>
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
        </>
      ) : (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <span className="text-sm font-medium text-amber-700">
            No active plan. Subscribe to access your tools.
          </span>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ONBOARDING)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200 hover:bg-amber-50"
          >
            <CreditCard className="h-4 w-4" />
            Subscribe
          </button>
        </div>
      )}
    </div>
  );
}