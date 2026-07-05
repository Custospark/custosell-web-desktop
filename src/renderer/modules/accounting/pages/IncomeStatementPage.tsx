import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useIncomeStatement, useAccountingPeriods } from '../api/AccountingQueries';
import { Printer, BarChart3 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

function Row({ label, amount, bold, indent, positive, topBorder }: { label: string; amount: number; bold?: boolean; indent?: boolean; positive?: boolean; topBorder?: boolean }) {
  return (
    <tr className={cn(topBorder && 'border-t-2 border-gray-800')}>
      <td className={cn('py-1.5 pr-4', bold ? 'font-semibold text-gray-900' : 'text-gray-600', indent && 'pl-8')}>{label}</td>
      <td className={cn('py-1.5 pl-4 text-right font-mono tabular-nums w-36', positive ? 'text-green-600 font-semibold' : amount < 0 ? 'text-red-600' : 'text-gray-900', bold && 'font-semibold')}>
        {formatCurrency(Math.abs(amount))}
      </td>
    </tr>
  );
}

export default function IncomeStatementPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const reportParams = useMemo(
    () => (periodId ? { period_id: Number(periodId), cacheKey: `period-${periodId}` } : undefined),
    [periodId],
  );
  const { data: stmt, isLoading, isError } = useIncomeStatement(reportParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Income Statement</h1>
            <p className="text-sm text-gray-500">Profit & loss overview</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1.5" />Print
        </Button>
      </div>

      <div className="flex gap-4 items-center print:hidden">
        <Select
          label="Period"
          options={[
            { value: '', label: 'Current Period' },
            ...(periods ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <Card><p className="text-sm text-red-500">Failed to load income statement.</p></Card>
      ) : stmt ? (
        <Card className="print:shadow-none print:border-none print:rounded-none print:p-0">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Custosell</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-1">Income Statement</h3>
            <p className="text-sm text-gray-500 mt-1">
              For the period {stmt.period.name} &mdash; {stmt.period.start_date} to {stmt.period.end_date}
            </p>
          </div>

          <table className="w-full text-sm border-collapse">
            <tbody>
              {stmt.sections && Object.entries(stmt.sections).map(([sectionName, accounts]) => (
                <tr key={sectionName}>
                  <td colSpan={2} className="p-0">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td colSpan={2} className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-1 pt-3">{sectionName}</td>
                        </tr>
                        {accounts.map((acc) => (
                          <Row key={acc.account_id} label={`${acc.code} - ${acc.name}`} amount={acc.balance} indent />
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}

              <tr><td colSpan={2} className="h-3" /></tr>

              <Row label="Total Revenue" amount={stmt.total_revenue} bold positive />
              <Row label="Total Cost of Goods Sold" amount={stmt.total_cost_of_goods_sold} indent />
              <Row label="Gross Profit" amount={stmt.gross_profit} bold positive topBorder />

              <tr><td colSpan={2} className="h-3" /></tr>

              <Row label="Total Operating Expenses" amount={stmt.total_operating_expenses} indent />
              <Row label="Operating Income (EBIT)" amount={stmt.operating_income} bold topBorder />

              <tr><td colSpan={2} className="h-3" /></tr>

              <Row label="Other Income" amount={stmt.other_income} indent positive />
              <Row label="Other Expenses" amount={stmt.other_expenses} indent />
              <Row label="Income Before Tax" amount={stmt.net_income_before_tax} bold topBorder />

              <tr><td colSpan={2} className="h-3" /></tr>

              <Row label="Tax Expense" amount={stmt.tax_expense} indent />
              <Row label="Net Income" amount={stmt.net_income} bold positive={stmt.net_income >= 0} topBorder />
            </tbody>
          </table>
        </Card>
      ) : (
        <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>
      )}
    </div>
  );
}
