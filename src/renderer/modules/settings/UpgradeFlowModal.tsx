import { useState } from 'react';
import { useUpgrade, useUpgradeQuote, useInitiatePayment, useBillingPayment, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import { Button } from '../../shared/components/buttons/Button';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { Loader2, CheckCircle, AlertCircle, X, Wallet, Tag } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import UpgradeFlowConfirmStep from './UpgradeFlowConfirmStep';

interface UpgradeFlowModalProps {
  plan: Plan;
  subscription: SubscriptionInfo;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
  userPhone: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

type Step = 'confirm' | 'upgrading' | 'paying' | 'polling' | 'done' | 'failed';

export default function UpgradeFlowModal({
  plan, subscription, billingCycle, currency, userPhone,
  onClose, onComplete,
}: UpgradeFlowModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [prorationDue, setProrationDue] = useState(0);
  const [prorationDueUsd, setProrationDueUsd] = useState(0);

  const { data: quote, isLoading: quoteLoading, isError: quoteError } = useUpgradeQuote(
    subscription.id, plan.id,
  );

  const referralDiscountUsd = subscription?.referral?.discount_applied
    ? Number(subscription.referral.discount_applied)
    : 0;
  const creditAfterProration = 0;

  const upgradeMutation = useUpgrade();
  const initiateMutation = useInitiatePayment('upgrade_proration');
  const paymentQuery = useBillingPayment(paymentId);

  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';
  const isPaymentFailed = paymentQuery.data?.data?.status === 'failed';

  const handleConfirm = () => {
    setStep('upgrading');
    upgradeMutation.mutate(
      { subscriptionId: subscription.id, to_plan_id: plan.id, effective: 'immediate' },
      {
        onSuccess: (result) => {
          const due = result.proration?.proration?.proration_due ?? prorationDue;
          const dueUsd = result.proration?.proration?.proration_due_usd ?? 0;
          if (due > 0) {
            setProrationDue(due);
            setProrationDueUsd(dueUsd);
            setStep('paying');
          } else {
            setStep('done');
          }
        },
        onError: (error) => {
          setErrorMessage(error.response?.data?.message || 'Failed to upgrade plan.');
          setStep('failed');
        },
      },
    );
  };

  const handlePay = () => {
    setStep('polling');
    const paymentCurrency = getPaymentCurrency();
    const amount = paymentCurrency === 'USD'
      ? (prorationDueUsd || prorationDue)
      : prorationDue;
    initiateMutation.mutate(
      {
        amount,
        currency: paymentCurrency,
        phone: userPhone,
        metadata: { action: 'upgrade', to_plan_id: plan.id },
      },
      {
        onSuccess: (result) => {
          setPaymentId(result.payment_id);
        },
        onError: (error) => {
          setErrorMessage(error.response?.data?.message || 'Payment initiation failed.');
          setStep('failed');
        },
      },
    );
  };

  const handleDone = async () => {
    await onComplete();
    onClose();
  };

  if (step === 'upgrading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <CustosellLoader fullPage={false} />
          <p className="text-sm text-gray-500">Upgrading your plan...</p>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <UpgradeFlowConfirmStep
        plan={plan}
        subscription={subscription}
        quote={quote}
        quoteLoading={quoteLoading}
        quoteError={quoteError}
        currency={currency}
        billingCycle={billingCycle}
        onClose={onClose}
        onConfirm={handleConfirm}
        upgradePending={upgradeMutation.isPending}
        upgradeError={upgradeMutation.error}
      />
    );
  }

  if (step === 'paying') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 relative">
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upgrade Payment</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">{plan.name}</h3>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl px-4 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Billing cycle</span>
              <span className="font-semibold text-gray-900 capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plan price</span>
              <span className="font-semibold text-gray-900">
                {formatUSD(quote?.new_plan.price_monthly_usd ?? 0)}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
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
            {creditAfterProration > 0 && referralDiscountUsd <= 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-green-600" />
                  Credit applied
                </span>
                <span className="font-semibold text-green-700">-{formatUSD(creditAfterProration)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Amount due today</span>
              <span className="font-bold text-blue-700 text-base">
                {referralDiscountUsd > 0
                  ? formatUSD(Math.max(0, (prorationDueUsd || prorationDue) - referralDiscountUsd))
                  : creditAfterProration > 0
                    ? formatUSD(Math.max(0, (prorationDueUsd || prorationDue) - creditAfterProration))
                    : getPaymentCurrency() === 'USD'
                      ? formatUSD(prorationDueUsd || prorationDue)
                      : formatCurrency(prorationDue, getPaymentCurrency())}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-sm text-gray-600">
              Phone: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
            </p>
            <p className="text-xs text-gray-400">You'll choose your payment method when you proceed.</p>
          </div>

          <Button type="button" onClick={handlePay} className="w-full gap-2 py-3 text-sm"
            loading={initiateMutation.isPending}>
            Pay {formatUSD(Math.max(0, (prorationDueUsd || prorationDue) - (referralDiscountUsd > 0 ? referralDiscountUsd : creditAfterProration)))}
          </Button>

          {initiateMutation.isError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{initiateMutation.error?.response?.data?.message || 'Payment initiation failed.'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'polling') {
    if (isPaymentDone) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Upgrade Complete!</p>
              <p className="text-sm text-gray-500 mt-1">
                Your plan has been upgraded to <span className="font-semibold">{plan.name}</span>.
              </p>
            </div>
            <Button type="button" onClick={handleDone} className="w-full gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (isPaymentFailed) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Payment Failed</p>
              <p className="text-sm text-gray-500 mt-1">
                Your payment could not be processed. Your plan has already been upgraded — you may need to complete payment later.
              </p>
            </div>
            <Button type="button" onClick={handleDone} className="w-full gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <div>
            <p className="text-lg font-bold text-gray-900">Waiting for Payment</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete the payment of {formatUSD(Math.max(0, (prorationDueUsd || prorationDue) - (referralDiscountUsd > 0 ? referralDiscountUsd : creditAfterProration)))}.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Follow the prompts on your phone <span className="font-semibold">{userPhone}</span> to complete the payment.
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Upgrade Complete!</p>
            <p className="text-sm text-gray-500 mt-1">
              Your plan has been upgraded to <span className="font-semibold">{plan.name}</span>.
            </p>
          </div>
          <Button type="button" onClick={handleDone} className="w-full gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Upgrade Failed</p>
          <p className="text-sm text-gray-500 mt-1">{errorMessage || 'An unexpected error occurred.'}</p>
        </div>
        <Button type="button" onClick={handleDone} className="w-full gap-2">
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
