import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import PlansTab from './PlansTab';
import BillingPaymentsTab from './ui/BillingPaymentsTab';
import BillingHistoryTab from './ui/BillingHistoryTab';
import {
  CreditCard, Building2, History, Wallet,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { useReferralEarnings } from '../../modules/referral/api/useReferralQueries';

type SubscriptionTab = 'plans' | 'payments' | 'history';

const TABS: { key: SubscriptionTab; label: string; icon: typeof CreditCard }[] = [
  { key: 'plans', label: 'Plans', icon: CreditCard },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'history', label: 'History', icon: History },
];

export default function SubscriptionSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubscriptionTab>('plans');
  const user = useAppSelector(state => state.auth.user);
  const subscription = user?.business?.subscription;
  const { isFetching: profileLoading, refetch: refetchProfile } = useProfile();

  const { data: earnings } = useReferralEarnings();
  const availableCredit = earnings?.available_credit ?? 0;

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
      {availableCredit > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Available credit from promo codes</span>
          </div>
          <span className="text-sm font-bold text-green-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(availableCredit)}</span>
        </div>
      )}

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

      {activeTab === 'plans' && <PlansTab subscription={subscription} onUpgradeComplete={async () => { await refetchProfile(); }} />}

      {activeTab === 'payments' && <BillingPaymentsTab />}

      {activeTab === 'history' && <BillingHistoryTab />}
    </div>
  );
}
