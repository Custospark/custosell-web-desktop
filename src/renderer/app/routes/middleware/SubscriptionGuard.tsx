import { useQuery } from '@tanstack/react-query';
import { Outlet, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/shared.paths';
import { axiosInstance } from '../../api/axiosConfig';
import { SUBSCRIPTIONS } from '../../../shared/api/endpoints/endpoints';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useAppSelector } from '../../store/hooks/useApp';
import { selectIsOnline } from '../../store/slices/networkSlice';
import { Building2, CreditCard, RefreshCw } from 'lucide-react';

interface AccessResponse {
  has_access: boolean;
}

function computeOfflineAccess(subscription: {
  status?: string | null;
  trial_ends_at?: string | null;
  grace_period_ends_at?: string | null;
  ends_at?: string | null;
  metadata?: { cancel_at_period_end?: boolean } | null;
}): boolean {
  const status = subscription?.status;
  if (!status) return false;

  if (status === 'active') {
    const cancelAtPeriodEnd = subscription?.metadata?.cancel_at_period_end ?? false;
    if (cancelAtPeriodEnd && subscription?.ends_at) {
      return new Date(subscription.ends_at).getTime() > Date.now();
    }
    return true;
  }

  if (status === 'trial') {
    if (!subscription?.trial_ends_at) return true;
    return new Date(subscription.trial_ends_at).getTime() > Date.now();
  }

  if (status === 'past_due') {
    if (!subscription?.grace_period_ends_at) return false;
    return new Date(subscription.grace_period_ends_at).getTime() > Date.now();
  }

  return false;
}

function useSubscriptionAccess() {
  const user = useAppSelector((s) => s.auth.user);
  const subscription = user?.business?.subscription;
  const isOnline = useAppSelector(selectIsOnline);

  return useQuery({
    queryKey: ['subscription', 'access'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AccessResponse>(SUBSCRIPTIONS.ACCESS);
      return data.has_access;
    },
    staleTime: 30_000,
    retry: false,
    enabled: isOnline !== false && (!!subscription || user?.business_id != null),
    placeholderData: () => {
      if (!isOnline && subscription) {
        return computeOfflineAccess(subscription);
      }
      return undefined;
    },
  });
}

const SUB_STATUS_INFO: Record<string, { title: string; description: string }> = {
  suspended: {
    title: 'Subscription suspended',
    description: 'Your subscription has been suspended due to non-payment. Reactivate to regain access.',
  },
  cancelled: {
    title: 'Subscription cancelled',
    description: 'Your subscription has been cancelled. Choose a new plan to continue using Custosell.',
  },
  past_due: {
    title: 'Payment required',
    description: 'Your subscription payment is past due. Make a payment to restore full access.',
  },
};

export function SubscriptionGuard() {
  const { data: hasAccess, isLoading } = useSubscriptionAccess();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const subscription = user?.business?.subscription;
  const status = subscription?.status as string | undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CustosellLoader />
      </div>
    );
  }

  if (hasAccess === true) {
    return <Outlet />;
  }

  const info = (status && SUB_STATUS_INFO[status]) ?? {
    title: 'No active subscription',
    description: 'You do not have an active subscription. Choose a plan to get started.',
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Building2 className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{info.title}</h2>
        <p className="mt-2 text-sm text-gray-500">{info.description}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.SETTINGS.SUBSCRIPTION)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <CreditCard className="h-4 w-4" />
            Manage subscription
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
