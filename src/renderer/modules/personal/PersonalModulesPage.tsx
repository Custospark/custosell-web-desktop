import { ShoppingBag, CheckCircle, Clock, AlertTriangle, CreditCard, Rocket } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { canAccessModule } from '../../shared/utils/moduleAccess';

const TOOLS: { slug: string; label: string; description: string }[] = [
  {
    slug: 'pipeline',
    label: 'Sales CRM / Pipeline',
    description: 'Manage leads, deals, and customer interactions with a visual pipeline board.',
  },
  {
    slug: 'estimates',
    label: 'Projects & Estimates',
    description: 'Create estimates, manage projects with tasks, and collaborate with your team.',
  },
  {
    slug: 'expenses',
    label: 'Income & Expenses',
    description: 'Record income, track expenses, and see your financial overview.',
  },
  {
    slug: 'accounting',
    label: 'Accounting',
    description: 'Full double-entry accounting — chart of accounts, journals, trial balance, P&L.',
  },
  {
    slug: 'documents',
    label: 'Documents',
    description: 'Store and organize business files securely in the cloud.',
  },
];

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
  const subscription = user?.business?.subscription;
  const status = subscription?.status ?? null;
  const config = status ? STATUS_CONFIG[status] : null;

  const tools = TOOLS.filter((t) => canAccessModule(user, t.slug));

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-28 sm:pb-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-md shadow-blue-500/20 sm:rounded-2xl sm:p-3">
            <ShoppingBag className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Your Tools</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              The <strong>Personal</strong> plan gives you all the tools you need — <strong>$10/mo</strong>.
            </p>
          </div>
        </div>
      </div>

      {subscription && config ? (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 ${config.bg}`}>
          {status === 'active' || status === 'trial' ? (
            <CheckCircle className={`h-5 w-5 ${config.color}`} />
          ) : (
            <AlertTriangle className={`h-5 w-5 ${config.color}`} />
          )}
          <span className={`text-sm font-medium ${config.color}`}>
            {status === 'trial' && subscription.trial_ends_at
              ? `Free trial until ${new Date(subscription.trial_ends_at).toLocaleDateString()} — subscribe now to avoid interruption`
              : status === 'active'
                ? 'Your Personal plan is active — all tools unlocked'
                : status === 'past_due'
                  ? 'Payment overdue. Subscribe to restore access to your tools.'
                  : status === 'suspended'
                    ? 'Your subscription has been suspended. Reactivate to regain access.'
                    : status === 'cancelled'
                      ? 'Your subscription has been cancelled. Choose a new plan to continue.'
                      : status === 'expired'
                        ? 'Your trial has expired. Subscribe to continue using your tools.'
                        : `Plan is ${status}`}
          </span>
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

      {subscription && (status === 'active' || status === 'trial') && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm">
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
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/40"
            >
              <Rocket className="h-4 w-4" />
              View Business Plans
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Included Tools</h2>
        <div className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[520px]:gap-3 xl:grid-cols-3">
          {TOOLS.map((t) => {
            const enabled = tools.some((tool) => tool.slug === t.slug);
            return (
              <div
                key={t.slug}
                className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 ${
                  enabled
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50/90 to-white shadow-sm shadow-blue-100/60'
                    : 'border-slate-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {enabled ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                </div>
                <p className="pl-8 text-xs leading-relaxed text-slate-500">{t.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}