import {
  Wallet,
  CircleDollarSign,
  Scale,
  History,
  WifiOff,
  Info,
} from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import PaymentHistoryList from './PaymentHistoryList';
import RecordPaymentForm, { type RecordPaymentInput } from './RecordPaymentForm';
import type { Sale } from '../sales/api/salesTypes';
import type { Invoice } from '../invoices/api/InvoiceTypes';
import type { Payment } from './paymentTypes';
import { cn } from '../../shared/utils/cn';
import {
  PipelineFormSection,
  PipelineModalHero,
} from '../pipeline/ui/pipelineFormFields';

interface PaymentsPanelProps {
  referenceLabel: string;
  referenceType: 'Sale' | 'Invoice';
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  payments: Payment[];
  canRecord: boolean;
  defaultMethod?: string;
  loading?: boolean;
  errorMessage?: string | null;
  offline?: boolean;
  sale?: Sale;
  invoice?: Invoice;
  /** Extra banner for supplier / view-only contexts. */
  viewOnlyNotice?: string | null;
  onDismissError?: () => void;
  onSubmit?: (input: RecordPaymentInput) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'neutral' | 'paid' | 'balance';
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3 py-3',
        tone === 'paid' && 'border-emerald-100 bg-emerald-50/80',
        tone === 'balance' && 'border-amber-100 bg-amber-50/80',
        tone === 'neutral' && 'border-gray-100 bg-gray-50/80',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          tone === 'paid' && 'bg-emerald-100 text-emerald-700',
          tone === 'balance' && 'bg-amber-100 text-amber-700',
          tone === 'neutral' && 'border border-gray-100 bg-white text-gray-500',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function PaymentsPanel({
  referenceLabel,
  referenceType,
  totalAmount,
  amountPaid,
  remainingBalance,
  payments,
  canRecord,
  defaultMethod,
  loading,
  errorMessage,
  offline,
  sale,
  invoice,
  viewOnlyNotice,
  onDismissError,
  onSubmit,
  onCancel,
  children,
}: PaymentsPanelProps) {
  const progress = totalAmount > 0 ? Math.min(100, (amountPaid / totalAmount) * 100) : 0;
  const branchName = sale?.location?.name ?? invoice?.location?.name ?? null;

  return (
    <div className="space-y-4">
      <PipelineModalHero
        icon={Wallet}
        title={canRecord ? 'Collect payment' : 'Payment receipts'}
        description={
          branchName
            ? `${referenceType} ${referenceLabel} · ${branchName} · ${payments.length} payment${payments.length === 1 ? '' : 's'} on record`
            : `${referenceType} ${referenceLabel} · ${payments.length} payment${payments.length === 1 ? '' : 's'} on record`
        }
        tone={canRecord ? 'emerald' : 'slate'}
      />

      {viewOnlyNotice ? (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>{viewOnlyNotice}</p>
        </div>
      ) : null}

      {offline ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          Offline — payments save locally and sync when you reconnect.
        </div>
      ) : null}

      <PipelineFormSection
        title="Balance summary"
        icon={Scale}
        description="Totals for this bill and how much remains open."
      >
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>Payment progress</span>
            <span className="font-medium tabular-nums">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryCard icon={CircleDollarSign} label="Total bill" value={formatCurrency(totalAmount)} tone="neutral" />
          <SummaryCard icon={Wallet} label="Paid" value={formatCurrency(amountPaid)} tone="paid" />
          <SummaryCard icon={Scale} label="Balance due" value={formatCurrency(remainingBalance)} tone="balance" />
        </div>
      </PipelineFormSection>

      <PipelineFormSection
        title="Payment history"
        icon={History}
        description={payments.length === 0 ? 'No payments recorded yet.' : 'Receipts already posted against this bill.'}
      >
        <PaymentHistoryList
          payments={payments}
          totalBill={totalAmount}
          referenceLabel={referenceLabel}
          referenceType={referenceType}
          sale={sale}
          invoice={invoice}
          compact
        />
      </PipelineFormSection>

      {canRecord && onSubmit ? (
        <RecordPaymentForm
          remainingBalance={remainingBalance}
          defaultMethod={defaultMethod}
          loading={loading}
          errorMessage={errorMessage}
          onDismissError={onDismissError}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : null}

      {children}
    </div>
  );
}
