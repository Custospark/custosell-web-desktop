import { ShoppingBag, CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

const TOOL_LABELS: Record<string, string> = {
  pipeline: 'Pipeline (Project Management)',
  estimates: 'Projects & Estimates',
  expenses: 'Expenses',
  accounting: 'Accounting',
  documents: 'Documents',
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
  const subscription = user?.business?.subscription;
  const planFeatures = subscription?.plan_features ?? {};
  const status = subscription?.status ?? null;
  const config = status ? STATUS_CONFIG[status] : null;

  const accessibleModules = user?.modules ?? [];
  const tools = Object.keys(TOOL_LABELS).filter((slug) => accessibleModules.includes(slug));

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
              ? `Free trial until ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
              : status === 'active'
                ? 'Your Personal plan is active'
                : status === 'past_due'
                  ? 'Payment required to continue accessing your tools'
                  : `Plan is ${status}`}
          </span>
          {(status === 'past_due' || !status) && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.ONBOARDING)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 hover:bg-blue-50"
            >
              <CreditCard className="h-4 w-4" />
              Pay now
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

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Included Tools</h2>
        <div className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[520px]:gap-3 xl:grid-cols-3">
          {Object.entries(TOOL_LABELS).map(([slug, label]) => {
            const enabled = tools.includes(slug);
            return (
              <div
                key={slug}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                  enabled
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50/90 to-white shadow-sm shadow-blue-100/60'
                    : 'border-slate-200 bg-white opacity-60'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {enabled ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </span>
                <span className="text-sm font-medium text-slate-900">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}