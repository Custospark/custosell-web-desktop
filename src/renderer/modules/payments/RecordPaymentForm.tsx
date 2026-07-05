import { useMemo, useState } from 'react';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { Paperclip, AlertCircle } from 'lucide-react';

export interface RecordPaymentInput {
  amount: number;
  payment_method: string;
  notes?: string;
  amount_tendered?: number;
  change_given?: number;
  attachment?: File | null;
}

interface RecordPaymentFormProps {
  remainingBalance: number;
  defaultMethod?: string;
  loading?: boolean;
  submitLabel?: string;
  errorMessage?: string | null;
  onSubmit: (input: RecordPaymentInput) => void;
  onCancel?: () => void;
  onDismissError?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

export default function RecordPaymentForm({
  remainingBalance,
  defaultMethod = 'cash',
  loading,
  submitLabel,
  errorMessage,
  onSubmit,
  onCancel,
  onDismissError,
}: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(remainingBalance);
  const [paymentMethod, setPaymentMethod] = useState(defaultMethod);
  const [notes, setNotes] = useState('');
  const [cashTendered, setCashTendered] = useState(remainingBalance);
  const [attachment, setAttachment] = useState<File | null>(null);

  const displayAmount = useMemo(
    () => Math.min(Math.max(0, amount), remainingBalance),
    [amount, remainingBalance],
  );

  const isCash = paymentMethod === 'cash';
  const changeDue = isCash ? Math.max(0, cashTendered - displayAmount) : 0;
  const cashShort = isCash && cashTendered > 0 && cashTendered < displayAmount - 0.009;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (displayAmount <= 0 || displayAmount > remainingBalance + 0.001) return;
    if (cashShort) return;

    onSubmit({
      amount: displayAmount,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      amount_tendered: displayAmount,
      change_given: changeDue > 0.009 ? changeDue : undefined,
      attachment,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-4">
      <p className="text-sm font-medium text-gray-800">Record payment</p>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            onClick={() => {
              setAmount(remainingBalance);
              setCashTendered(remainingBalance);
            }}
          >
            Pay full balance
          </button>
        </div>
        <input
          type="number"
          min={0.01}
          max={remainingBalance}
          step="0.01"
          value={displayAmount}
          onChange={(e) => {
            onDismissError?.();
            const next = parseFloat(e.target.value) || 0;
            setAmount(next);
            if (isCash && cashTendered < next) setCashTendered(next);
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {isCash && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cash tendered</label>
          <input
            type="number"
            min={displayAmount}
            step="0.01"
            value={cashTendered || ''}
            onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {cashShort && (
            <p className="text-xs text-red-600 mt-1">Tendered amount must cover the payment.</p>
          )}
          {changeDue > 0.009 && (
            <p className="text-xs text-emerald-700 mt-1 tabular-nums">Change: {formatCurrency(changeDue)}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Reference, cheque #, etc."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <Paperclip className="w-3.5 h-3.5 inline mr-1" />
          Attachment (optional)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/jpg,application/pdf,.doc,.docx,.xlsx"
          onChange={(e) => setAttachment(e.target.files?.[0] || null)}
          className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
        />
        <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, PDF, Word, or Excel · max 5 MB</p>
        {attachment && (
          <p className="text-xs text-gray-400 mt-1">{attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)</p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        )}
        <Button size="sm" type="submit" loading={loading} disabled={cashShort || displayAmount <= 0}>
          {submitLabel ?? `Record ${formatCurrency(displayAmount)}`}
        </Button>
      </div>
    </form>
  );
}
