import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { BILLING } from '../../api/endpoints/endpoints';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ManualPaymentVerifyProps {
  /** Payment id returned by initiation — required to confirm. */
  paymentId: number | null;
  /** Called after a successful confirm so the caller refetches payment status. */
  onVerified: () => void;
  className?: string;
}

/**
 * Manual "I've Completed Payment — Verify" control shown on every payment
 * waiting screen (web, mobile, and Electron). Lets the user ask the backend to
 * confirm a payment that polling hasn't picked up yet, so every workflow has
 * the same verify path regardless of device.
 */
export default function ManualPaymentVerify({ paymentId, onVerified, className }: ManualPaymentVerifyProps) {
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!paymentId) return;
    setVerifying(true);
    setMessage(null);
    try {
      const { data } = await axiosInstance.post(BILLING.CONFIRM(paymentId));
      if (data?.success) {
        onVerified();
        // Payment reconciled and subscription applied — refresh profile +
        // access so the UI updates immediately (no re-login needed).
        queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'access'] });
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      } else {
        setMessage(data?.message || 'Payment not yet confirmed.');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setMessage(apiErr?.response?.data?.message || 'Could not verify payment. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleVerify()}
        disabled={verifying || !paymentId}
        className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {verifying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        {verifying ? 'Verifying...' : "I've Completed Payment — Verify"}
      </button>
      {message && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
