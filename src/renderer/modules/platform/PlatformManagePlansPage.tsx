import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../app/api/axiosConfig';
import { PLANS } from '../../shared/api/endpoints/endpoints';
import { CreditCard, Users, Package, Building2, Check, X, Loader2 } from 'lucide-react';
import type { Plan } from '../../shared/types';

const FEATURE_LABELS: Record<string, string> = {
  sales: 'Point of Sale', inventory: 'Inventory', customers: 'Customers',
  expenses: 'Expenses', dashboard: 'Dashboard', invoices: 'Invoicing',
  pipeline: 'Pipeline', estimates: 'Estimates & Projects', storefront: 'Storefront',
  marketplace: 'Marketplace', documents: 'Documents', accounting: 'Accounting',
  hr: 'HR & Payroll', forecasting: 'Forecasting & Budgets',
};

export default function PlatformManagePlansPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(PLANS);
      return data.data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage subscription plans and pricing</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans?.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              {plan.is_popular && (
                <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-2 py-0.5 rounded-full">Popular</span>
              )}
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {Number(plan.price_monthly).toLocaleString('en-UG')} <span className="text-sm font-normal text-gray-400">UGX/mo</span>
            </div>
            {plan.onboarding_fee_ugx ? (
              <p className="text-xs text-amber-600 font-semibold">Onboarding: {Number(plan.onboarding_fee_ugx).toLocaleString('en-UG')} UGX</p>
            ) : null}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Limits</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {plan.limits && Object.entries(plan.limits).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-gray-600">
                    {key === 'max_staff' && <Users className="w-3.5 h-3.5" />}
                    {key === 'max_products' && <Package className="w-3.5 h-3.5" />}
                    {key === 'max_businesses' && <Building2 className="w-3.5 h-3.5" />}
                    <span className="capitalize">{key.replace('max_', '')}:</span>
                    <span className="font-medium">{val ?? '∞'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Features</p>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(plan.features).filter(([, v]) => v).map(([key]) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span>{FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}