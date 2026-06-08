import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDate, formatShiftDateTime } from '../../shared/utils/formatDateTime';
import { cashHandover, netSalesAfterRefunds } from '../../shared/utils/accounting';

export interface ShiftReceiptTotals {
  transactionCount: number;
  grossSales: number;
  refunds: number;
  cash: number;
  mobileMoney: number;
  cardOther: number;
  shiftExpenses: number;
}

interface ShiftReceiptContentProps {
  businessName: string;
  cashierName: string;
  clockIn: string | null | undefined;
  clockOutLabel: string;
  totals: ShiftReceiptTotals;
  preview?: boolean;
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${negative ? 'text-red-600' : ''}`}>
      <span>{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'}>{value}</span>
    </div>
  );
}

export default function ShiftReceiptContent({
  businessName,
  cashierName,
  clockIn,
  clockOutLabel,
  totals,
  preview = false,
}: ShiftReceiptContentProps) {
  const netSales = netSalesAfterRefunds(totals.grossSales, totals.refunds);
  const handover = cashHandover(totals.cash, totals.shiftExpenses);

  return (
    <div className="bg-white p-4 max-w-sm mx-auto text-xs">
      <div className="text-center mb-3">
        <h2 className="text-base font-bold uppercase">{businessName}</h2>
        <p className="text-gray-500">Shift Report{preview ? ' (Preview)' : ''}</p>
        <p className="text-gray-400">{formatShiftDate(clockIn)}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 border-b py-2 mb-3 space-y-1">
        <Row label="Cashier:" value={cashierName} />
        <Row label="Clock In:" value={formatShiftDateTime(clockIn)} />
        <Row label="Clock Out:" value={clockOutLabel} />
      </div>

      <div className="space-y-1 mb-3">
        <Row label="Sales Count:" value={String(totals.transactionCount)} bold />
        <Row label="Gross Sales:" value={formatCurrency(totals.grossSales)} />
        {totals.refunds > 0 && (
          <Row label="Refunds:" value={`-${formatCurrency(totals.refunds)}`} negative />
        )}
        <Row label="Net Sales:" value={formatCurrency(netSales)} bold />
      </div>

      <div className="border-t border-dashed border-gray-300 pt-2 mb-3 space-y-1">
        <Row label="Cash:" value={formatCurrency(totals.cash)} />
        <Row label="Mobile Money:" value={formatCurrency(totals.mobileMoney)} />
        <Row label="Card/Other:" value={formatCurrency(totals.cardOther)} />
      </div>

      {(totals.shiftExpenses > 0 || totals.cash > 0) && (
        <div className="border-t border-dashed border-gray-300 pt-2 mb-3 space-y-1">
          {totals.shiftExpenses > 0 && (
            <Row label="Shift Expenses:" value={`-${formatCurrency(totals.shiftExpenses)}`} negative />
          )}
          <Row label="Cash at handover:" value={formatCurrency(handover)} bold />
        </div>
      )}

      <div className="text-center text-gray-400 border-t border-dashed border-gray-300 pt-2">
        End of Shift Report
      </div>
    </div>
  );
}
