import { useState } from 'react';
import { useUpgrade, useUpgradeQuote, useInitiatePayment, useBillingPayment, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { useApplyReferralCode, useReferralEarnings } from '../../modules/referral/api/useReferralQueries';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import { Button } from '../../shared/components/buttons/Button';
import PaymentPhoneField from '../../shared/components/inputs/PaymentPhoneField';
import { isValidPaymentPhone } from '../../shared/utils/phoneNumber';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { Loader2, CheckCircle, AlertCircle, X, Wallet, Tag, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import { useUsdToLocal } from '../../shared/utils/useUsdToLocal';
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
  plan, subscription, billingCycle: initialBillingCycle, currency, userPhone,
  onClose, onComplete,
}: UpgradeFlowModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [upgradeCycle, setUpgradeCycle] = useState<'monthly' | 'yearly'>(initialBillingCycle);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [prorationDue, setProrationDue] = useState(0);
  const [prorationDueUsd, setProrationDueUsd] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | undefined>(userPhone || undefined);

  const applyReferralMutation = useApplyReferralCode();

  const { data: quote, isLoading: quoteLoading, isError: quoteError, error: quoteErrorObj } = useUpgradeQuote(
    subscription.id, plan.id, upgradeCycle,
  );

  const quoteErrorMessage = (quoteErrorObj && (quoteErrorObj as { response?: { data?: { message?: string } } })?.response?.data?.message) ?? undefined;

  const { data: earnings } = useReferralEarnings();
  const availableCredit = earnings?.available_credit ?? 0;
  const creditAfterProration = availableCredit > 0
    ? Math.min(availableCredit, prorationDueUsd || prorationDue)
    : 0;

  const paymentCurrency = getPaymentCurrency();
  const { isUsd, toLocal } = useUsdToLocal(paymentCurrency);
  const dueUsd = prorationDueUsd || prorationDue;
  const netDueUsd = Math.max(0, dueUsd - creditAfterProration);
  const formatUsdValue = (usd: number) => isUsd ? formatUSD(usd) : formatCurrency(toLocal(usd), paymentCurrency);
  const formatDue = formatUsdValue(netDueUsd);

  const upgradeMutation = useUpgrade();
  const initiateMutation = useInitiatePayment('upgrade_proration');
  const paymentQuery = useBillingPayment(paymentId);

  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';
  const isPaymentFailed = paymentQuery.data?.data?.status === 'failed';

  const handleConfirm = () => {
    setStep('upgrading');
    upgradeMutation.mutate(
      { subscriptionId: subscription.id, to_plan_id: plan.id, effective: 'immediate', billing_cycle: upgradeCycle },
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
        billingCycle: upgradeCycle,
        phone,
        metadata: { action: 'upgrade', to_plan_id: plan.id, billing_cycle: upgradeCycle },
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
        billingCycle={upgradeCycle}
        onBillingCycleChange={setUpgradeCycle}
        quoteErrorMessage={quoteErrorMessage}
        onClose={onClose}
        onConfirm={handleConfirm}
        upgradePending={upgradeMutation.isPending}
        upgradeError={upgradeMutation.error as never}
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
              <span className="font-semibold text-gray-900 capitalize">{upgradeCycle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plan price</span>
              <span className="font-semibold text-gray-900">
                {formatUSD((upgradeCycle === 'yearly' ? quote?.new_plan.price_yearly_usd ?? 0 : quote?.new_plan.price_monthly_usd ?? 0))}/{upgradeCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            </div>
            {creditAfterProration > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-green-600" />
                  Credit applied
                </span>
                <span className="font-semibold text-green-700">-{formatUsdValue(creditAfterProration)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Amount due today</span>
              <span className="font-bold text-blue-700 text-base">{formatDue}</span>
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
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              const discount = data?.referral?.discount_applied;
                              const num = Number(discount);
                              setReferralSuccess(
                                num > 0 ? '$' + num.toFixed(2) + '/mo discount applied' : 'Code applied successfully'
                              );
                              setReferralCode('');
                            },
                          },
                        );
                      }
                    }}
                    disabled={!referralCode.trim() || applyReferralMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
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

          <Button type="button" onClick={handlePay} className="w-full gap-2 py-3 text-sm"
            loading={initiateMutation.isPending} disabled={!isValidPaymentPhone(phone)}>
            Pay {formatDue}
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
              Complete the payment of {formatDue}.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Follow the prompts on your phone <span className="font-semibold">{phone}</span> to complete the payment.
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
