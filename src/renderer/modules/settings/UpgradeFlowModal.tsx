import { useState } from 'react';
import { useUpgrade, useUpgradeQuote, useInitiatePayment, useBillingPayment } from '../../shared/api/account/SubscriptionQueries';
import type { UpgradeQuote } from '../../shared/api/account/SubscriptionQueries';
import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';
import { Button } from '../../shared/components/buttons/Button';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X, ArrowUp } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';

interface UpgradeFlowModalProps {
  plan: Plan;
  subscription: SubscriptionInfo;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
  userPhone: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

type Step = 'loading' | 'confirm' | 'upgrading' | 'paying' | 'polling' | 'done' | 'failed';

export default function UpgradeFlowModal({
  plan, subscription, billingCycle, currency, userPhone,
  onClose, onComplete,
}: UpgradeFlowModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [prorationDue, setProrationDue] = useState(0);
  const [quote, setQuote] = useState<UpgradeQuote | null>(null);

  const { data: fetchedQuote, isLoading: quoteLoading, isError: quoteError } = useUpgradeQuote(
    subscription.id, plan.id,
  );

  const upgradeMutation = useUpgrade();
  const initiateMutation = useInitiatePayment('upgrade_proration');
  const paymentQuery = useBillingPayment(paymentId);

  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';
  const isPaymentFailed = paymentQuery.data?.data?.status === 'failed';

  if (!quoteLoading && !quoteError && fetchedQuote && step === 'loading') {
    setQuote(fetchedQuote);
    setProrationDue(fetchedQuote.proration.proration_due);
    setStep('confirm');
  }

  if (quoteError && step === 'loading') {
    setErrorMessage('Failed to load upgrade quote. Please try again.');
    setStep('failed');
  }

  const handleConfirm = () => {
    setStep('upgrading');
    upgradeMutation.mutate(
      { subscriptionId: subscription.id, to_plan_id: plan.id, effective: 'immediate' },
      {
        onSuccess: (result) => {
          const due = result.proration?.proration?.proration_due ?? prorationDue;
          if (due > 0) {
            setProrationDue(due);
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
    initiateMutation.mutate(
      {
        amount: prorationDue,
        currency,
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

  const pr = quote?.proration;

  if (step === 'loading' || step === 'upgrading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <CustosellLoader fullPage={false} />
          <p className="text-sm text-gray-500">
            {step === 'upgrading' ? 'Upgrading your plan...' : 'Loading upgrade details...'}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'confirm' && pr) {
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
            <div className="border-t border-amber-300 pt-2 flex justify-between text-sm">
              <span className="font-bold text-gray-800">Amount due today</span>
              <span className="font-bold text-blue-700 text-base">{formatCurrency(pr.proration_due, currency)}</span>
            </div>
          </div>

          <Button type="button" onClick={handleConfirm} className="w-full gap-2 py-3 text-sm"
            loading={upgradeMutation.isPending}>
            Confirm Upgrade
            <ArrowRight className="w-4 h-4" />
          </Button>

          {upgradeMutation.isError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{upgradeMutation.error?.response?.data?.message || 'Upgrade failed.'}</span>
            </div>
          )}
        </div>
      </div>
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
                {formatCurrency(pr?.new_price ?? 0, currency)}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Prorated amount due today</span>
              <span className="font-bold text-blue-700 text-base">
                {formatCurrency(prorationDue, currency)}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-sm text-gray-600">
              Mobile Money: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
            </p>
            <p className="text-xs text-gray-400">An STK push will be sent to this number.</p>
          </div>

          <Button type="button" onClick={handlePay} className="w-full gap-2 py-3 text-sm"
            loading={initiateMutation.isPending}>
            Pay {formatCurrency(prorationDue, currency)}
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
    const isDone = isPaymentDone;
    const isFailed = isPaymentFailed;

    if (isDone) {
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
              Complete the payment of {formatCurrency(prorationDue, currency)} via Mobile Money.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              An STK push will be sent to <span className="font-semibold">{userPhone}</span>
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
        <Button type="button" onClick={onClose} variant="outline" className="w-full gap-2">
          Close
        </Button>
      </div>
    </div>
  );
}
