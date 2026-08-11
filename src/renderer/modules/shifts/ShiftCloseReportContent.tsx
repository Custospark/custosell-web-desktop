import { formatCurrency } from '../../shared/utils/formatCurrency';
import { formatShiftDateTime } from '../../shared/utils/formatDateTime';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { SHIFT_NET_SALES_FORMULA, SHIFT_REPORT_ACCENT, type ShiftCloseReportData } from './shiftCloseReportTypes';

interface ShiftCloseReportContentProps {
  data: ShiftCloseReportData;
  /** Hides screen-only notices so print/PDF output stays clean */
  forPrint?: boolean;
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 min-w-0 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums leading-tight ${highlight ? 'text-blue-800' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, bold, negative, sub }: { label: string; value: string; bold?: boolean; negative?: boolean; sub?: boolean }) {
  return (
    <tr className={bold ? 'bg-blue-50' : undefined}>
      <td className={`border border-gray-200 px-3 py-2 text-left ${sub ? 'pl-6 text-gray-600' : ''} ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {label}
      </td>
      <td
        className={`border border-gray-200 px-3 py-2 text-right tabular-nums ${negative ? 'text-red-600' : ''} ${bold ? 'font-bold text-blue-800 text-base' : 'font-medium text-gray-900'}`}
      >
        {value}
      </td>
    </tr>
  );
}

export default function ShiftCloseReportContent({ data, forPrint = false }: ShiftCloseReportContentProps) {
  const ccy = data.currency;

  return (
    <div className="bg-white text-gray-800 font-sans mx-auto w-full max-w-[210mm] p-6 print:p-5">
      <header className="text-center border-b-2 border-blue-700 pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide text-blue-800">{data.businessName}</h1>
        {data.businessAddress && <p className="text-[11px] text-gray-500 mt-1">{data.businessAddress}</p>}
        {(data.businessPhone || data.businessEmail) && (
          <p className="text-[11px] text-gray-500">
            {[data.businessPhone && `Tel: ${data.businessPhone}`, data.businessEmail].filter(Boolean).join(' · ')}
          </p>
        )}
      </header>

      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">Shift Close Report</h2>
      </div>

      {data.isOfflineCopy && !forPrint && (
        <div className="text-center text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 mb-4 print:hidden">
          Offline copy — official PDF available when Online.
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-4 text-center text-[11px] text-gray-700">
        {data.branchName && (
          <>
            <span className="font-semibold text-gray-900">Branch: {data.branchName}</span>
            <span className="mx-2 text-gray-300">|</span>
          </>
        )}
        <span className="font-semibold text-gray-900">{data.cashierName}</span>
        <span className="mx-2 text-gray-300">|</span>
        <span>As of {formatShiftDateTime(data.clockOut ?? data.generatedAt)}</span>
        {data.duration && (
          <>
            <span className="mx-2 text-gray-300">|</span>
            <span>{data.duration}</span>
          </>
        )}
      </div>

      <p className="text-[10px] text-center text-gray-500 mb-3">
        {SHIFT_NET_SALES_FORMULA}
        {data.taxEnabled && '. VAT shown separately for tax reporting.'}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <SummaryCard label="Cash at handover" value={formatCurrency(data.cashHandover)} highlight />
        <SummaryCard label="Net sales" value={formatCurrency(data.netSales)} />
        <SummaryCard label="Transactions" value={String(data.transactionCount)} />
        <SummaryCard
          label="Shift expenses"
          value={data.shiftExpenses > 0 ? `-${formatCurrency(data.shiftExpenses)}` : formatCurrency(0)}
        />
      </div>

      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Shift totals</h3>
      <table className="w-full border-collapse text-[11px] mb-5">
        <thead>
          <tr>
            <th className="border border-gray-200 px-3 py-2 text-left bg-blue-700 text-white font-semibold w-[62%]">
              Item
            </th>
            <th className="border border-gray-200 px-3 py-2 text-right bg-blue-700 text-white font-semibold">
              {ccy}
            </th>
          </tr>
        </thead>
        <tbody>
          <Row label="Gross sales" value={formatCurrency(data.grossSales)} />
          {data.shiftExpenses > 0 && (
            <Row label="Shift expenses" value={`-${formatCurrency(data.shiftExpenses)}`} negative />
          )}
          {data.refunds > 0 && (
            <Row label="Refunds" value={`-${formatCurrency(data.refunds)}`} negative />
          )}
          {data.taxEnabled && (
            <>
              <Row label="Output VAT (net)" value={formatCurrency(data.outputVat ?? 0)} sub />
              {(data.vatRefunded ?? 0) > 0 && (
                <Row label="VAT refunded" value={`-${formatCurrency(data.vatRefunded ?? 0)}`} negative sub />
              )}
            </>
          )}
          <Row label="Net sales" value={formatCurrency(data.netSales)} bold />
          <Row label="Cash collected" value={formatCurrency(data.cash)} sub />
          <Row label="Mobile money" value={formatCurrency(data.mobileMoney)} sub />
          <Row label="Card / other" value={formatCurrency(data.cardOther)} sub />
          <Row label="Cash at handover" value={formatCurrency(data.cashHandover)} bold />
        </tbody>
      </table>

      <div
        className="rounded-xl border-2 px-5 py-4 text-center mb-5"
        style={{ borderColor: SHIFT_REPORT_ACCENT, backgroundColor: '#eff6ff' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
          Cash at Handover
        </p>
        <p className="text-2xl font-bold tabular-nums text-blue-900">{formatCurrency(data.cashHandover)}</p>
        <p className="text-[10px] text-gray-500 mt-1">Cash collected minus shift expenses paid from the drawer</p>
      </div>

      <footer className="text-center text-[10px] text-gray-400 pt-4 border-t border-gray-200">
        <p>
          Powered by{' '}
          <a href="https://www.custosell.com" className="text-blue-600 underline" target="_blank" rel="noreferrer">
            {PRODUCT_NAME}
          </a>
          {' '}| A product of{' '}
          <a href="https://www.custospark.com" className="text-blue-600 underline" target="_blank" rel="noreferrer">
            Custospark Company Ltd
          </a>
        </p>
        <p className="mt-1 text-gray-400">
          Generated {formatShiftDateTime(data.generatedAt)}
        </p>
      </footer>
    </div>
  );
}
