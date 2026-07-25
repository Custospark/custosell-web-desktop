import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { PlanCards, PlansLoading } from '../../shared/components/plans/PlanCards';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

const FEATURE_COMPARISON: Record<string, [boolean, boolean, boolean]> = {
  'Point of Sale': [true, true, true],
  'Inventory Management': [true, true, true],
  'Customer Management': [true, true, true],
  'Expense Tracking': [true, true, true],
  'Dashboard & Analytics': [true, true, true],
  'Online Storefront': [true, true, true],
  'Sales Pipeline': [false, true, true],
  'Estimates & Projects': [false, true, true],
  'Supply Marketplace': [false, true, true],
  'Document Management': [false, true, true],
  'Full Accounting': [false, false, true],
  'HR & Payroll': [false, false, true],
  'Forecasting & Budgets': [false, false, true],
};

const FAQS = [
  { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade at any time. Changes take effect on your next billing cycle.' },
  { q: 'What payment methods are accepted?', a: 'We accept mobile money (MTN MoMo, Airtel Money) and bank transfers. Card payments coming soon.' },
  { q: 'How does the onboarding fee work?', a: 'The one-time setup fee is paid during registration to activate your account. After payment, your trial period begins.' },
  { q: 'What happens after I pay the setup fee?', a: 'Your subscription activates immediately. If your plan includes trial days, you get trial access for that period before the first billing cycle.' },
  { q: 'Do you offer annual discounts?', a: 'Yes. Annual billing reduces the monthly rate — you get better value by paying yearly.' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { data: plans, isLoading, isError, refetch } = useActivePlans();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const planSlugs = ['essential', 'professional', 'enterprise'];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <div className="text-center mb-10 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-4">
          Simple, Transparent{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
            Pricing
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
          One platform for your entire business. Pay a one-time setup fee, then choose your plan.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm font-semibold ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-400'}`}>
            Annual
            <span className="ml-1 text-[10px] text-blue-600 font-bold">Save ~17%</span>
          </span>
        </div>
      </div>

      {isLoading && <PlansLoading />}

      {isError && (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-gray-500 text-sm">Unable to load pricing plans.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      )}

      {plans && plans.length > 0 && (
        <>
          <PlanCards
            plans={plans}
            billingCycle={billingCycle}
            hideTrialBadge
            onSelect={(plan) => navigate(ROUTES.REGISTER, { state: { planId: plan.id, billingCycle } })}
            ctaLabel="Get Started"
          />

          <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 sm:p-8 mt-12 mb-16 overflow-x-auto">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
              Feature Comparison
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Feature</th>
                  {planSlugs.map((slug) => {
                    const p = plans.find((pl) => pl.slug === slug);
                    return (
                      <th key={slug} className="text-center py-3 px-2 font-semibold text-blue-600">
                        {p?.name ?? slug}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(FEATURE_COMPARISON).map(([feature, tiers]) => (
                  <tr key={feature} className="border-b border-gray-100 odd:bg-gray-50/50">
                    <td className="py-2.5 px-2 font-medium text-gray-700">{feature}</td>
                    {tiers.map((has, i) => (
                      <td key={i} className={`text-center py-2.5 px-2 ${has ? 'text-blue-500 font-bold' : 'text-gray-300'}`}>
                        {has ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-gray-200">
                  <td colSpan={4} className="py-3 px-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Limits</span>
                  </td>
                </tr>
                {['max_staff', 'max_products', 'max_businesses'].map((key) => {
                  const label = key === 'max_staff' ? 'Staff accounts' : key === 'max_products' ? 'Products' : 'Business locations';
                  return (
                    <tr key={key} className="border-b border-gray-100 odd:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-medium text-gray-700">{label}</td>
                      {planSlugs.map((slug) => {
                        const p = plans.find((pl) => pl.slug === slug);
                        const val = p?.limits?.[key];
                        return (
                          <td key={slug} className="text-center py-2.5 px-2 font-semibold text-gray-900">
                            {val === null || val === undefined ? '—' : val === -1 ? '∞' : Intl.NumberFormat('en-US').format(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((item) => (
                <div key={item.q} className="rounded-xl border-2 border-gray-200 bg-white/80 p-5">
                  <h3 className="font-bold text-gray-900 mb-1.5">{item.q}</h3>
                  <p className="text-sm text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Ready to get started?
            </h2>
            <p className="text-base text-gray-500 mb-6">
              Pay the one-time setup fee and start your plan today.
            </p>
            <Button
              size="lg"
              onClick={() => navigate(ROUTES.REGISTER)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-lg hover:shadow-xl"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {!isLoading && !isError && (!plans || plans.length === 0) && (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-sm">Pricing plans are not available at this time.</p>
        </div>
      )}
    </div>
  );
}
