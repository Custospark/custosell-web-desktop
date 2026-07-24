import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SUBSCRIPTIONS } from '../../shared/api/endpoints/endpoints';
import { Loader2 } from 'lucide-react';

export default function PlatformManageSubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'subscriptions'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(SUBSCRIPTIONS.BASE);
      return data.data ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const subscriptions = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">View all business subscriptions</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Billing Cycle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Onboarding Paid</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Next Billing</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No subscriptions found</td></tr>
            ) : subscriptions.map((sub: Record<string, unknown>) => (
              <tr key={String(sub.id)} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{String((sub.business as Record<string, unknown>)?.name ?? sub.business_id ?? '—')}</td>
                <td className="px-4 py-3 text-gray-600">{String((sub.plan as Record<string, unknown>)?.name ?? sub.plan_id ?? '—')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    sub.status === 'active' || sub.status === 'trial' ? 'bg-green-100 text-green-700' :
                    sub.status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                    sub.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{String(sub.status ?? '—')}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{String(sub.billing_cycle ?? '—')}</td>
                <td className="px-4 py-3">
                  {sub.onboarding_fee_paid ? (
                    <span className="text-green-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-amber-600 font-medium">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{sub.next_billing_date ? String(sub.next_billing_date).split('T')[0] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}