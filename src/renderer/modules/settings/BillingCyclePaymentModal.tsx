import { useState } from 'react';
import { useInitiatePayment, useBillingPayment, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { Button } from '../../shared/components/buttons/Button';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../shared/utils/formatCurrency';
import { useUsdToLocal } from '../../shared/utils/useUsdToLocal';
import type { PaymentType } from '../../shared/types';

interface BillingCyclePaymentModalProps {
  proration: Record<string, unknown>;
  billingCycle: string;
  currency: string;
  userPhone: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

export default function BillingCyclePaymentModal({
  proration, billingCycle, currency, userPhone,
  onClose, onComplete,
}: BillingCyclePaymentModalProps) {
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [step, setStep] = useState<'confirm' | 'paying' | 'polling' | 'done'>('confirm');

  const initiateMutation = useInitiatePayment('billing_cycle_change' satisfies PaymentType);
  const paymentQuery = useBillingPayment(paymentId);

  const amountDueUsd = Number(proration.proration_due_usd ?? 0);
  const { isUsd, toLocal } = useUsdToLocal(currency);
  const formatUsdValue = (usd: number) => isUsd ? formatUSD(usd) : formatCurrency(toLocal(usd), currency);

  const handlePay = () => {
    setStep('paying');
    initiateMutation.mutate(
      {
        amount: amountDueUsd,
        currency: getPaymentCurrency(),
        phone: userPhone,
        metadata: { action: 'billing_cycle_change' },
      },
      {
        onSuccess: (result) => {
          setPaymentId(result.payment_id);
          setStep('polling');
        },
        onError: () => setStep('confirm'),
      },
    );
  };

  const isDone = paymentQuery.data?.data?.status === 'completed';
  const isFailed = paymentQuery.data?.data?.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 relative">
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        {step === 'polling' && (isDone || isFailed) ? null : (
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Billing Cycle Change</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">Switch to {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</h3>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Yearly price</span>
                <span className="font-semibold text-gray-900">{formatUsdValue(Number(proration.new_price_usd ?? 0))}/yr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Credit for remaining days</span>
                <span className="font-semibold text-green-700">-{formatUsdValue(Number(proration.credit_usd ?? 0))}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
                <span className="font-semibold text-gray-700">Amount due today</span>
                <span className="font-bold text-blue-700 text-base">{formatUsdValue(amountDueUsd)}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-sm text-gray-600">
                Phone: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
              </p>
              <p className="text-xs text-gray-400">You'll choose your payment method when you proceed.</p>
            </div>

            <Button type="button" onClick={handlePay} className="w-full gap-2 py-3 text-sm" loading={initiateMutation.isPending}>
              Pay {formatUsdValue(amountDueUsd)}
            </Button>

            {initiateMutation.isError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{initiateMutation.error?.response?.data?.message || 'Payment initiation failed.'}</span>
              </div>
            )}
          </>
        )}

        {step === 'polling' && !isDone && !isFailed && (
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
            <p className="text-sm text-gray-500">Waiting for payment...</p>
          </div>
        )}

        {step === 'polling' && isDone && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 text-center">Billing Cycle Updated!</p>
            <Button type="button" onClick={onComplete} className="w-full gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {step === 'polling' && isFailed && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-sm text-gray-500 text-center">Payment failed. Please try again.</p>
            <Button type="button" onClick={() => setStep('confirm')} className="w-full gap-2">
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
