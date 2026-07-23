import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/PlanCards';
import { axiosInstance } from '../../app/api/axiosConfig';
import { BILLING } from '../../shared/api/endpoints/endpoints';
import {
  CreditCard, CheckCircle, XCircle, AlertCircle,
  ArrowUp, ArrowDown, Clock, CalendarDays,
  Users, Package, Building2, Loader2,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';

interface BillingPaymentRecord {
  id: number;
  amount: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Past Due' },
  suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expired' },
};

const PAYMENT_STATUS_ICONS: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  completed: 'text-green-600',
  pending: 'text-amber-600',
  failed: 'text-red-600',
};

const LIMIT_LABELS: Record<string, string> = {
  max_staff: 'Staff Members',
  max_products: 'Products',
  max_customers: 'Customers',
  max_sales_daily: 'Daily Sales',
};

const LIMIT_ICONS: Record<string, typeof Users> = {
  max_staff: Users,
  max_products: Package,
  max_customers: Users,
};

export default function SubscriptionSettingsPage() {
  const user = useAppSelector(state => state.auth.user);
  const subscription = user?.business?.subscription;

  const { data: plans, isLoading: plansLoading } = useActivePlans();

  const currentPlan = useMemo(() => {
    if (!plans || !subscription) return null;
    return plans.find(p => p.id === subscription.plan_id) ?? null;
  }, [plans, subscription]);

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BillingPaymentRecord[] }>(BILLING.PAYMENTS);
      return data.data;
    },
    enabled: !!subscription,
  });

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Building2 className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-1">No active subscription</h2>
        <p className="text-sm">Your business does not have an active subscription plan.</p>
      </div>
    );
  }

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statusInfo = STATUS_STYLES[subscription.status] || STATUS_STYLES.active;

  const nonNullLimits = currentPlan
    ? Object.entries(currentPlan.limits).filter(([, v]) => v !== null) as [string, number][]
    : [];

  const sortedPlans = plans ? [...plans].sort((a, b) => a.sort_order - b.sort_order) : [];

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
              <>
                <CheckCircle className="w-4 h-4 text-green-300" />
                <span className="text-sm">Setup fee paid</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-300" />
                <span className="text-sm">Setup fee pending</span>
              </>
            )}
          </div>
        </div>
      </div>

      {nonNullLimits.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nonNullLimits.map(([key, maxValue]) => {
              const Icon = LIMIT_ICONS[key] || Package;
              const label = LIMIT_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span>{label}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">0 / {maxValue}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: '0%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedPlans.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Available Plans</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {sortedPlans.map(plan => {
              const isCurrent = plan.id === subscription.plan_id;
              const currentSortOrder = currentPlan?.sort_order ?? 0;
              const isUpgrade = plan.sort_order > currentSortOrder;
              const price = Number(plan.price_monthly);
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-xl border-2 p-4 transition-all flex flex-col',
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm',
                  )}
                >
                  {plan.is_popular && !isCurrent && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow whitespace-nowrap">
                      Popular
                    </span>
                  )}
                  <div className={cn('space-y-2', plan.is_popular && !isCurrent && 'pt-3')}>
                    <h4 className="font-bold text-gray-900">{plan.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-gray-900">
                        {price > 0
                          ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(price)
                          : 'Free'}
                      </span>
                      {price > 0 && <span className="text-xs text-gray-400">/mo</span>}
                    </div>
                    {isCurrent ? (
                      <span className="inline-block mt-2 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        Current plan
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          'mt-2 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                          isUpgrade
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                        )}
                      >
                        {isUpgrade ? (
                          <><ArrowUp className="w-3 h-3" /> Upgrade</>
                        ) : (
                          <><ArrowDown className="w-3 h-3" /> Downgrade</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h3>
        {paymentsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {payments.map(payment => {
              const StatusIcon = PAYMENT_STATUS_ICONS[payment.status] || Clock;
              return (
                <div key={payment.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('en-UG', { style: 'currency', currency: payment.currency || 'UGX', maximumFractionDigits: 0 }).format(Number(payment.amount))}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className={cn('flex items-center gap-1.5 text-xs font-medium', PAYMENT_STATUS_STYLES[payment.status] || 'text-gray-500')}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{payment.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No payment records found.</p>
        )}
      </div>
    </div>
  );
}