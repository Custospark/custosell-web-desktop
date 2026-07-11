import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Paperclip,
  StickyNote,
  Wallet,
} from 'lucide-react';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineInputClass,
  pipelineSelectClass,
} from '../pipeline/ui/pipelineFormFields';
import { cn } from '../../shared/utils/cn';

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

const notesClass = cn(
  pipelineInputClass,
  'min-h-[72px] resize-none py-2.5 leading-relaxed',
);

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
      amount_tendered: isCash ? cashTendered : displayAmount,
      change_given: changeDue > 0.009 ? changeDue : undefined,
      attachment,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PipelineFormSection
        title="Record payment"
        icon={Wallet}
        description={`Balance due ${formatCurrency(remainingBalance)}. Partial payments are allowed.`}
      >
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            onClick={() => {
              setAmount(remainingBalance);
              setCashTendered(remainingBalance);
            }}
          >
            Pay full balance ({formatCurrency(remainingBalance)})
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PipelineIconField label="Amount" icon={CircleDollarSign} required hint="Cannot exceed balance due">
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
              className={pipelineInputClass}
              required
            />
          </PipelineIconField>

          <PipelineIconField label="Method" icon={CreditCard} required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={pipelineSelectClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </PipelineIconField>
        </div>

        {isCash ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField
              label="Cash tendered"
              icon={Banknote}
              hint={cashShort ? 'Tendered amount must cover the payment.' : undefined}
            >
              <input
                type="number"
                min={displayAmount}
                step="0.01"
                value={cashTendered || ''}
                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                className={cn(pipelineInputClass, cashShort && 'border-red-300 focus:border-red-500 focus:ring-red-500/20')}
              />
            </PipelineIconField>
            <div className="flex items-end">
              <div className={cn(
                'w-full rounded-lg border px-3 py-2.5 text-sm',
                changeDue > 0.009
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-gray-100 bg-gray-50 text-gray-500',
              )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">Change due</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(changeDue)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <PipelineIconField label="Notes" icon={StickyNote} hint="Optional — reference, cheque #, mobile money ID">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Reference, cheque #, etc."
            className={notesClass}
          />
        </PipelineIconField>

        <PipelineIconField
          label="Attachment"
          icon={Paperclip}
          hint={attachment
            ? `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`
            : 'JPG, PNG, PDF, Word, or Excel · max 5 MB'}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf,.doc,.docx,.xlsx"
            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            className={cn(
              pipelineInputClass,
              'cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100',
            )}
          />
        </PipelineIconField>
      </PipelineFormSection>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
        {onCancel ? (
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        ) : null}
        <Button size="sm" type="submit" loading={loading} disabled={cashShort || displayAmount <= 0}>
          {submitLabel ?? `Record ${formatCurrency(displayAmount)}`}
        </Button>
      </div>
    </form>
  );
}
