import { useState } from 'react';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import type { UpgradeQuote } from '../../shared/api/account/SubscriptionQueries';
import type { ApiError } from '../../shared/api/account/AccountTypes';
import type { AxiosError } from 'axios';
import { useReferralEarnings, useApplyReferralCode } from '../referral/api/useReferralQueries';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { Button } from '../../shared/components/buttons/Button';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X, ArrowUp, Wallet, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';

interface UpgradeFlowConfirmStepProps {
  plan: Plan;
  subscription: SubscriptionInfo;
  quote: UpgradeQuote | undefined;
  quoteLoading: boolean;
  quoteError: boolean;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onConfirm: () => void;
  upgradePending: boolean;
  upgradeError: AxiosError<ApiError> | null;
}

export default function UpgradeFlowConfirmStep({
  plan, subscription, quote, quoteLoading, quoteError, currency, billingCycle,
  onClose, onConfirm, upgradePending, upgradeError,
}: UpgradeFlowConfirmStepProps) {
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeSuccess, setPromoCodeSuccess] = useState<string | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const applyReferralMutation = useApplyReferralCode();
  const { refetch: refetchProfile } = useProfile();

  const { data: earnings } = useReferralEarnings();
  const availableCredit = earnings?.available_credit ?? 0;
  const referralDiscountUsd = subscription?.referral?.discount_applied
    ? Number(subscription.referral.discount_applied)
    : 0;

  if (quoteLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <CustosellLoader fullPage={false} />
          <p className="text-sm text-gray-500">Loading upgrade details...</p>
        </div>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-gray-500">Failed to load upgrade quote. Please try again.</p>
          <Button type="button" onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    );
  }

  const pr = quote?.proration;
  if (!pr) return null;

  const creditAfterProration = availableCredit > 0
    ? Math.min(availableCredit, pr.proration_due_usd ?? pr.proration_due)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 relative">
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <ArrowUp className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Upgrade to {plan.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Review the prorated charges before confirming.</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current plan</span>
            <span className="font-semibold text-gray-900">{quote?.current_plan.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} price</span>
            <span className="font-semibold text-gray-900">{formatCurrency(pr.old_price, currency)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
            <span className="text-gray-600">New plan</span>
            <span className="font-semibold text-gray-900">{plan.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} price</span>
            <span className="font-semibold text-gray-900">{formatCurrency(pr.new_price, currency)}</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Proration breakdown</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Days remaining in period</span>
            <span className="font-semibold text-gray-900">{pr.days_remaining} / {pr.days_in_period}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Credit for unused days</span>
            <span className="font-semibold text-green-700">{formatCurrency(pr.credit, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Charge for remaining days</span>
            <span className="font-semibold text-gray-900">{formatCurrency(pr.charge, currency)}</span>
          </div>
          {referralDiscountUsd > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-green-600" />
                Promo discount
              </span>
              <span className="font-semibold text-green-700">-{formatUSD(referralDiscountUsd)}</span>
            </div>
          )}
          {availableCredit > 0 && referralDiscountUsd <= 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-green-600" />
                Credit applied
              </span>
              <span className="font-semibold text-green-700">-{formatUSD(creditAfterProration)}</span>
            </div>
          )}
          <div className={cn(
            'border-t pt-2 flex justify-between text-sm',
            (referralDiscountUsd > 0 || availableCredit > 0) ? 'border-amber-300' : 'border-amber-300',
          )}>
            <span className="font-bold text-gray-800">Amount due today</span>
            <span className="font-bold text-blue-700 text-base">
              {referralDiscountUsd > 0
                ? formatUSD(Math.max(0, (pr.proration_due_usd ?? 0) - referralDiscountUsd))
                : availableCredit > 0
                  ? formatUSD(Math.max(0, (pr.proration_due_usd ?? 0) - creditAfterProration))
                  : formatCurrency(pr.proration_due, currency)}
            </span>
          </div>
          {referralDiscountUsd > 0 && (
            <p className="text-[10px] text-green-700 text-center pt-1">
              {formatUSD(referralDiscountUsd)} promo discount applied
            </p>
          )}
          {availableCredit > 0 && referralDiscountUsd <= 0 && (
            <p className="text-[10px] text-green-700 text-center pt-1">
              {formatUSD(availableCredit)} credit available — {formatUSD(creditAfterProration)} applied
            </p>
          )}
        </div>

        {!subscription.referral?.code && !promoCodeSuccess && (
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => setShowPromoInput((v) => !v)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                Have a promo or referral code?
              </span>
              {showPromoInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showPromoInput && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (promoCodeInput.trim()) {
                      setPromoCodeSuccess(null);
                      applyReferralMutation.mutate(
                        { referral_code: promoCodeInput.trim() },
                        {
                          onSuccess: () => {
                            setPromoCodeSuccess('Code applied successfully');
                            setPromoCodeInput('');
                            setShowPromoInput(false);
                            refetchProfile();
                          },
                        },
                      );
                    }
                  }}
                  disabled={!promoCodeInput.trim() || applyReferralMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {applyReferralMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}
            {applyReferralMutation.isError && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {applyReferralMutation.error?.response?.data?.message || 'Failed to apply code'}
              </p>
            )}
          </div>
        )}

        {promoCodeSuccess && (
          <div className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            {promoCodeSuccess}
          </div>
        )}

        <Button type="button" onClick={onConfirm} className="w-full gap-2 py-3 text-sm"
          loading={upgradePending}>
          Confirm Upgrade
          <ArrowRight className="w-4 h-4" />
        </Button>

        {upgradeError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{upgradeError?.response?.data?.message || 'Upgrade failed.'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
