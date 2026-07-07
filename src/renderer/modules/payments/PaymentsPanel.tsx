import {
  Wallet,
  CircleDollarSign,
  Scale,
  History,
  FileText,
  WifiOff,
} from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import PaymentHistoryList from './PaymentHistoryList';
import RecordPaymentForm, { type RecordPaymentInput } from './RecordPaymentForm';
import type { Sale } from '../sales/api/salesTypes';
import type { Invoice } from '../invoices/api/InvoiceTypes';
import type { Payment } from './paymentTypes';
import { cn } from '../../shared/utils/cn';

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
        'rounded-xl border px-3 py-3 flex items-start gap-2.5',
        tone === 'paid' && 'bg-emerald-50/80 border-emerald-100',
        tone === 'balance' && 'bg-amber-50/80 border-amber-100',
        tone === 'neutral' && 'bg-gray-50/80 border-gray-100',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          tone === 'paid' && 'bg-emerald-100 text-emerald-700',
          tone === 'balance' && 'bg-amber-100 text-amber-700',
          tone === 'neutral' && 'bg-white text-gray-500 border border-gray-100',
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-bold tabular-nums text-gray-900 mt-0.5 break-words">{value}</p>
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
  onDismissError,
  onSubmit,
  onCancel,
  children,
}: PaymentsPanelProps) {
  const progress = totalAmount > 0 ? Math.min(100, (amountPaid / totalAmount) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Payments</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{referenceLabel}</p>
          <p className="text-[11px] text-gray-400 mt-1">{referenceType} · {payments.length} payment{payments.length === 1 ? '' : 's'}</p>
        </div>
        <FileText className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>

      {offline && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <WifiOff className="w-4 h-4 shrink-0" />
          Offline — payments save locally and sync when you reconnect.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-gray-500">
          <span>Payment progress</span>
          <span className="tabular-nums font-medium">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SummaryCard icon={CircleDollarSign} label="Total bill" value={formatCurrency(totalAmount)} tone="neutral" />
        <SummaryCard icon={Wallet} label="Paid" value={formatCurrency(amountPaid)} tone="paid" />
        <SummaryCard icon={Scale} label="Balance due" value={formatCurrency(remainingBalance)} tone="balance" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-800">Payment history</p>
        </div>
        <PaymentHistoryList
          payments={payments}
          totalBill={totalAmount}
          referenceLabel={referenceLabel}
          referenceType={referenceType}
          sale={sale}
          invoice={invoice}
          compact
        />
      </div>

      {canRecord && onSubmit && (
        <RecordPaymentForm
          remainingBalance={remainingBalance}
          defaultMethod={defaultMethod}
          loading={loading}
          errorMessage={errorMessage}
          onDismissError={onDismissError}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}

      {children}
    </div>
  );
}
