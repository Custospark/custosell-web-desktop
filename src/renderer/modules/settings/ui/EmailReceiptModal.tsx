import { useState } from 'react';
import { Mail, ReceiptText, WifiOff } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Input } from '../../../shared/components/inputs/Input';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useEmailReceipt } from '../api/billingReceipts';

interface EmailReceiptModalProps {
  open: boolean;
  paymentId: number;
  reference?: string;
  amount: string;
  currency: string;
  defaultEmail: string;
  onClose: () => void;
}

export default function EmailReceiptModal({
  open,
  paymentId,
  reference,
  amount,
  currency,
  defaultEmail,
  onClose,
}: EmailReceiptModalProps) {
  const emailReceipt = useEmailReceipt();
  const { isCompletelyOffline } = useNetworkStatus();
  const [to, setTo] = useState(defaultEmail);
  const [toError, setToError] = useState<string | undefined>();
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTo(defaultEmail);
      setToError(undefined);
    }
  }

  const offline = isCompletelyOffline;
  const isPending = emailReceipt.isPending;

  const amountLabel = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency || 'UGX',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (offline || isPending) return;

    const trimmedTo = to.trim();
    if (!trimmedTo) {
      setToError('Enter the email address to send the receipt to');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      setToError('Enter a valid email address');
      return;
    }

    setToError(undefined);
    try {
      await emailReceipt.mutateAsync({ paymentId, email: trimmedTo });
      onClose();
    } catch {
      /* toast handled in hook */
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Email receipt" size="sm">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <p className="flex items-center gap-1.5 font-medium">
            <ReceiptText className="h-4 w-4" />
            {reference ? `Receipt ${reference}` : `Receipt #${paymentId}`}
          </p>
          <p className="mt-1.5 text-xs text-blue-700/80">
            {amountLabel} — we'll email the receipt as a PDF attachment.
          </p>
        </div>

        {offline && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Connect to the internet to send email.</span>
          </div>
        )}

        <Input
          label="Send to"
          type="email"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            if (toError) setToError(undefined);
          }}
          placeholder="recipient@example.com"
          error={toError}
          disabled={offline || isPending}
          autoComplete="email"
        />

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={offline}>
            <Mail className="mr-1.5 h-4 w-4" />
            Send receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}
