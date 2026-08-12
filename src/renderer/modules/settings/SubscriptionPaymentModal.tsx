import { useState } from 'react';
import { useInitiatePayment, useBillingPayment } from '../../shared/api/account/SubscriptionQueries';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useReferralEarnings, useApplyReferralCode } from '../../modules/referral/api/useReferralQueries';
import { Button } from '../../shared/components/buttons/Button';
import PaymentPhoneField from '../../shared/components/inputs/PaymentPhoneField';
import { isValidPaymentPhone } from '../../shared/utils/phoneNumber';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X, Wallet, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import { useUsdToLocal } from '../../shared/utils/useUsdToLocal';
import type { PaymentType } from '../../shared/types';

interface SubscriptionPaymentModalProps {
  planName: string;
  planPrice: number;
  billingCycle: string;
  amount: number;
  currency: string;
  userPhone: string;
  actionLabel: string;
  paymentType: PaymentType;
  metadata?: Record<string, unknown>;
  topupMonths?: number;
  refreshing?: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type SubscriptionReferral = {
  code?: string | null;
  discount_type?: string | null;
  discount_value?: string | null;
  discount_duration_months?: number | null;
  discount_applied?: string | null;
  status?: string | null;
} | null;

function referenceDiscount(referral: SubscriptionReferral, planPrice: number, billingCycle: string): number {
  if (!referral) return 0;
  if (referral.discount_type === 'percentage') {
    return Math.round((planPrice * Number(referral.discount_value ?? 0)) / 100 * 100) / 100;
  }
  if (referral.discount_type === 'free_month') {
    return billingCycle === 'yearly' ? Math.round(planPrice / 12 * 100) / 100 : planPrice;
  }
  return Number(referral.discount_applied ?? 0);
}

export default function SubscriptionPaymentModal({
  planName, planPrice, billingCycle, amount, currency, userPhone,
  actionLabel, paymentType, metadata, topupMonths, refreshing, onClose, onComplete,
}: SubscriptionPaymentModalProps) {
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralDiscountUsd, setReferralDiscountUsd] = useState(0);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | undefined>(userPhone || undefined);

  const { data: earnings } = useReferralEarnings();
  const applyReferralMutation = useApplyReferralCode();
  const { refetch: refetchProfile, data: profileData } = useProfile();
  const profileReferral = profileData?.business?.subscription?.referral;
  const persistedDiscountUsd = referenceDiscount(profileReferral, planPrice, billingCycle);
  const activeDiscountUsd = referralDiscountUsd > 0 ? referralDiscountUsd : persistedDiscountUsd;
  const { isUsd, toLocal } = useUsdToLocal(currency);
  const availableCreditUsd = earnings?.available_credit ?? 0;
  const creditApplied = isUsd
    ? Math.min(availableCreditUsd, amount)
    : Math.min(toLocal(availableCreditUsd), amount);
  const amountAfterCredit = amount - creditApplied;
  const discountConverted = isUsd ? activeDiscountUsd : toLocal(activeDiscountUsd);
  const amountAfterDiscount = Math.max(0, amountAfterCredit - discountConverted);
  const formatLocal = (value: number) => formatCurrency(value, currency);

  const initiateMutation = useInitiatePayment(paymentType);
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);

  const isDone = paymentQuery.data?.data?.status === 'completed';
  const isFailed = paymentQuery.data?.data?.status === 'failed';

  const [popupBlocked, setPopupBlocked] = useState(false);

  const handlePay = () => {
    setPopupBlocked(false);
    initiateMutation.mutate(
      { amount, currency, billingCycle: billingCycle as 'monthly' | 'yearly', phone, metadata, topupMonths },
      {
        onSuccess: (result) => {
          setPaymentId(result.payment_id);
          setInitiated(true);
          if (result.redirect_url) {
            const win = window.open(result.redirect_url, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
              setPopupBlocked(true);
            }
          }
        },
      },
    );
  };

  if (isDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          {refreshing ? (
            <>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Updating...</p>
                <p className="text-sm text-gray-500 mt-1">Refreshing your plan information.</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Payment Successful!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your {actionLabel.toLowerCase()} to <span className="font-semibold">{planName}</span> is complete.
                </p>
              </div>
              <Button type="button" onClick={onComplete} className="w-full gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (initiated && !isFailed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <div>
            <p className="text-lg font-bold text-gray-900">Waiting for Payment</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete the payment in the opened window.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              An STK push will be sent to <span className="font-semibold">{phone}</span>
            </p>
          </div>
          {popupBlocked && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-left">
              Pop-up was blocked. Please allow pop-ups for this site or use the link below manually.
            </div>
          )}

          {paymentQuery.data?.data?.status === 'failed' && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-red-600">Payment was not completed.</p>
              <Button type="button" onClick={() => { setPaymentId(null); setInitiated(false); }} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Payment Failed</p>
            <p className="text-sm text-gray-500 mt-1">
              Your payment could not be processed. Please try again or contact support.
            </p>
          </div>
          <Button type="button" onClick={() => { setPaymentId(null); setInitiated(false); }} className="w-full gap-2">
            Try Again
            <ArrowRight className="w-4 h-4" />
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{actionLabel}</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{planName}</h3>
        </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl px-4 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Billing cycle</span>
              <span className="font-semibold text-gray-900 capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plan price</span>
              <span className="font-semibold text-gray-900">
                {formatLocal(planPrice)}
                <span className="text-xs text-gray-400 font-normal">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
              </span>
            </div>
            {creditApplied > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-green-600" />
                  Credit applied
                </span>
                <span className="font-semibold text-green-700">-{isUsd ? formatUSD(creditApplied) : formatLocal(creditApplied)}</span>
              </div>
            )}
            {discountConverted > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-green-600" />
                  Promo discount
                </span>
                <span className="font-semibold text-green-700">
                  -{isUsd ? formatUSD(discountConverted) : formatLocal(discountConverted)}
                </span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Total due today</span>
              <span className="font-bold text-blue-700 text-base">
                {discountConverted > 0 || creditApplied > 0
                  ? (isUsd ? formatUSD(amountAfterDiscount) : formatLocal(amountAfterDiscount))
                  : formatLocal(amount)}
              </span>
            </div>
          </div>

        <PaymentPhoneField
          initialPhone={userPhone}
          onChange={setPhone}
          label="Mobile Money number"
        />

        <div className="border border-gray-200 rounded-xl px-4 py-3">
          <button
            type="button"
            onClick={() => setShowReferralInput((v) => !v)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              Have a referral or promo code?
            </span>
            {showReferralInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showReferralInput && (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (referralCode.trim()) {
                      setReferralSuccess(null);
                      applyReferralMutation.mutate(
                        { referral_code: referralCode.trim() },
                        {
                          onSuccess: (data) => {
                            const num = Number(data?.referral?.discount_applied ?? 0);
                            setReferralDiscountUsd(num > 0 ? num : 0);
                            setReferralSuccess(
                              num > 0 ? '$' + num.toFixed(2) + ' discount applied' : 'Code applied successfully'
                            );
                            setReferralCode('');
                            refetchProfile();
                          },
                        },
                      );
                    }
                  }}
                  disabled={!referralCode.trim() || applyReferralMutation.isPending}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer sm:w-auto"
                >
                  {applyReferralMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {referralSuccess && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  {referralSuccess}
                </div>
              )}
              {applyReferralMutation.isError && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {applyReferralMutation.error?.response?.data?.message || 'Failed to apply code'}
                </div>
              )}
            </>
          )}
        </div>

        <Button
          type="button"
          onClick={handlePay}
          className="w-full gap-2 py-3 text-sm"
          loading={initiateMutation.isPending}
          disabled={!amount || !isValidPaymentPhone(phone)}
        >
          Pay Now
        </Button>

        {initiateMutation.isError && !initiated && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{initiateMutation.error?.message || 'Payment initiation failed.'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
