import { useState } from 'react';
import { useInitiatePayment, useBillingPayment } from '../../shared/api/account/AccountQueries';
import { Button } from '../../shared/components/buttons/Button';
import { Loader2, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';

interface UpgradePaymentModalProps {
  planName: string;
  amount: number;
  currency: string;
  userPhone: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function UpgradePaymentModal({
  planName, amount, currency, userPhone, onClose, onComplete,
}: UpgradePaymentModalProps) {
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);

  const initiateMutation = useInitiatePayment('upgrade_proration');
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);

  const isDone = paymentQuery.data?.data?.status === 'completed';
  const isFailed = paymentQuery.data?.data?.status === 'failed';

  const handlePay = () => {
    initiateMutation.mutate(
      { amount, currency, phone: userPhone },
      {
        onSuccess: (result) => {
          setPaymentId(result.payment_id);
          setInitiated(true);
          if (result.redirect_url) {
            window.open(result.redirect_url, '_blank');
          }
        },
      },
    );
  };

  if (isDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Payment Successful!</p>
            <p className="text-sm text-gray-500 mt-1">
              Your upgrade to <span className="font-semibold">{planName}</span> is complete.
            </p>
          </div>
          <Button type="button" onClick={onComplete} className="w-full gap-2">
            Done
            <ArrowRight className="w-4 h-4" />
          </Button>
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
              Complete your payment in the opened window.
            </p>
          </div>
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
              Your payment could not be processed. The upgrade is on hold. Please try again or contact support.
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
          <p className="text-sm font-medium text-gray-500">Upgrade to {planName}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {new Intl.NumberFormat('en-UG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)}
          </p>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Prorated upgrade fee</p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
          <p className="text-sm text-gray-600">
            Mobile Money: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
          </p>
          <p className="text-xs text-gray-400">An STK push will be sent to this number.</p>
        </div>

        <Button
          type="button"
          onClick={handlePay}
          className="w-full gap-2 py-3 text-sm"
          loading={initiateMutation.isPending}
          disabled={!amount || !userPhone}
        >
          Pay Upgrade Fee
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
