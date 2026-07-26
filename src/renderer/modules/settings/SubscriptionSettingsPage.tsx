import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useSubscriptionChanges } from '../../shared/api/account/SubscriptionQueries';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { axiosInstance } from '../../app/api/axiosConfig';
import { BILLING } from '../../shared/api/endpoints/endpoints';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import PlansTab from './PlansTab';
import {
  CreditCard, CheckCircle, XCircle, Clock,
  Building2, ArrowUp, ArrowDown, History,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';

type SubscriptionTab = 'plans' | 'payments' | 'history';

interface BillingPaymentRecord {
  id: number;
  amount: string;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  created_at: string;
}

const TABS: { key: SubscriptionTab; label: string; icon: typeof CreditCard }[] = [
  { key: 'plans', label: 'Plans', icon: CreditCard },
  { key: 'payments', label: 'Payments', icon: Clock },
  { key: 'history', label: 'History', icon: History },
];

export default function SubscriptionSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubscriptionTab>('plans');
  const user = useAppSelector(state => state.auth.user);
  const subscription = user?.business?.subscription;
  const { isFetching: profileLoading, refetch: refetchProfile } = useProfile();

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BillingPaymentRecord[] }>(BILLING.PAYMENTS);
      return data.data;
    },
    enabled: !!subscription,
  });

  const subId = subscription?.id ?? null;
  const { data: changes, isLoading: changesLoading } = useSubscriptionChanges(subId ? Number(subId) : null);

  if (profileLoading) {
    return <CustosellLoader fullPage={false} />;
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Building2 className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-1">No plan selected</h2>
        <p className="text-sm mb-6">You haven't chosen a subscription plan yet.</p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ONBOARDING)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Choose a plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'plans' && <PlansTab subscription={subscription} onUpgradeComplete={() => refetchProfile()} />}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h3>
          {paymentsLoading ? (
            <div className="flex justify-center py-6">
              <CustosellLoader fullPage={false} />
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {payments.map(payment => {
                const StatusIcon = payment.status === 'completed' ? CheckCircle : payment.status === 'failed' ? XCircle : Clock;
                return (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: payment.currency || 'UGX', maximumFractionDigits: 0 }).format(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                      {payment.description && <p className="text-xs text-gray-400">{payment.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium capitalize"
                      style={{ color: payment.status === 'completed' ? '#16a34a' : payment.status === 'failed' ? '#dc2626' : '#d97706' }}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{payment.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No payment records found.</p>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Changes</h3>
          {changesLoading ? (
            <div className="flex justify-center py-6">
              <CustosellLoader fullPage={false} />
            </div>
          ) : changes && changes.length > 0 ? (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {changes.map((change: Record<string, unknown>) => {
                const status = change.status as string;
                const changeType = change.change_type as string;
                const effectiveAt = change.effective_at as string;
                const createdAt = change.created_at as string;
                return (
                  <div key={change.id as number} className="relative">
                    <div className={cn(
                      'absolute -left-5 mt-1.5 w-2.5 h-2.5 rounded-full border-2',
                      status === 'applied' ? 'bg-green-500 border-green-200'
                        : status === 'pending' ? 'bg-amber-500 border-amber-200'
                        : 'bg-gray-400 border-gray-200',
                    )} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {changeType === 'upgrade' && <><ArrowUp className="w-3.5 h-3.5 inline text-green-600 mr-1" />Upgrade</>}
                          {changeType === 'downgrade' && <><ArrowDown className="w-3.5 h-3.5 inline text-amber-600 mr-1" />Downgrade</>}
                          {changeType === 'cancel' && <><XCircle className="w-3.5 h-3.5 inline text-red-500 mr-1" />Cancellation</>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {changeType !== 'cancel' && (
                            <>From <span className="font-medium">{(change as Record<string, { name?: string }>).from_plan?.name || 'Unknown'}</span> → <span className="font-medium">{(change as Record<string, { name?: string }>).to_plan?.name || 'Unknown'}</span></>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          status === 'applied' ? 'bg-green-100 text-green-700'
                            : status === 'pending' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500',
                        )}>
                          {status === 'applied' ? 'Applied' : status === 'pending' ? 'Scheduled' : 'Cancelled'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {status === 'pending'
                            ? `Effective ${new Date(effectiveAt).toLocaleDateString()}`
                            : `Created ${new Date(createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No plan changes recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
