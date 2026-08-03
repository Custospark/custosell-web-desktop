import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';

interface RenewTopUpModalProps {
  plan: Plan;
  subscription: SubscriptionInfo;
  userPhone: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

const PRESET_CHIPS: { label: string; months: number }[] = [
  { label: '1 mo', months: 1 },
  { label: '3 mo', months: 3 },
  { label: '6 mo', months: 6 },
  { label: '1 yr', months: 12 },
  { label: '2 yr', months: 24 },
];

function addMonthsToDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString();
}

export default function RenewTopUpModal({
  plan, subscription, userPhone, onClose, onComplete,
}: RenewTopUpModalProps) {
  const [months, setMonths] = useState(3);
  const [custom, setCustom] = useState('');
  const [confirming, setConfirming] = useState(false);

  const currency = getPaymentCurrency();
  const isYearly = subscription.billing_cycle === 'yearly';

  const monthlyRateUsd = isYearly
    ? Number(plan.price_yearly_usd ?? 0) / 12
    : Number(plan.price_monthly_usd ?? 0);

  const amountUsd = Math.round(months * monthlyRateUsd * 100) / 100;

  const applyChip = (m: number) => {
    setMonths(m);
    setCustom('');
  };

  const applyCustom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustom(value);
    const parsed = parseInt(value, 10);
    if (value && !Number.isNaN(parsed)) {
      setMonths(Math.min(60, Math.max(1, parsed)));
    }
  };

  const isCustom = custom !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Renew Early</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1">Top Up {plan.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Prepay for extra time and extend your plan beyond its next billing date.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">How much time would you like to add?</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_CHIPS.map((chip) => (
              <button
                key={chip.months}
                type="button"
                onClick={() => applyChip(chip.months)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                  !isCustom && months === chip.months
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label htmlFor="topup-custom" className="text-xs text-gray-500">Or enter a custom number (1–60 months)</label>
            <input
              id="topup-custom"
              type="number"
              min={1}
              max={60}
              value={custom}
              onChange={applyCustom}
              placeholder="e.g. 9"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Billing cycle</span>
            <span className="font-semibold text-gray-900 capitalize">{isYearly ? 'Yearly' : 'Monthly'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">New billing date</span>
            <span className="font-semibold text-gray-900">{addMonthsToDate(months)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
            <span className="font-semibold text-gray-700">Total due</span>
            <span className="font-bold text-blue-700 text-base">
              {currency === 'USD' ? formatUSD(amountUsd) : formatCurrency(amountUsd, currency)}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
          <p className="text-sm text-gray-600">
            Mobile Money: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
          </p>
          <p className="text-xs text-gray-400">
            Adds {months} month{months === 1 ? '' : 's'} to your <span className="capitalize">{isYearly ? 'yearly' : 'monthly'}</span> cycle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!userPhone}
          className="w-full gap-2 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center"
        >
          Continue to Payment
          <ArrowRight className="w-4 h-4" />
        </button>

        {confirming && (
          <SubscriptionPaymentModal
            planName={plan.name}
            planPrice={monthlyRateUsd}
            billingCycle={isYearly ? 'yearly' : 'monthly'}
            amount={amountUsd}
            currency={currency}
            userPhone={userPhone}
            actionLabel="Renew Early"
            paymentType="topup"
            metadata={{ action: 'topup', topup_months: months }}
            topupMonths={months}
            onClose={() => setConfirming(false)}
            onComplete={async () => {
              setConfirming(false);
              await onComplete();
            }}
          />
        )}
      </div>
    </div>
  );
}