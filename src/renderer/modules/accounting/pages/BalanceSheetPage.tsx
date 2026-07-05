import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useBalanceSheet, useAccountingPeriods } from '../api/AccountingQueries';
import { Printer, BarChart3 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export default function BalanceSheetPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const reportParams = useMemo(
    () => (periodId ? { period_id: Number(periodId), cacheKey: `period-${periodId}` } : undefined),
    [periodId],
  );
  const { data: sheet, isLoading, isError } = useBalanceSheet(reportParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Balance Sheet</h1>
            <p className="text-sm text-gray-500">Financial position overview</p>
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
        <Card><p className="text-sm text-red-500">Failed to load balance sheet.</p></Card>
      ) : sheet ? (
        <Card className="print:shadow-none print:border-none print:rounded-none print:p-0">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Custosell</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-1">Balance Sheet</h3>
            <p className="text-sm text-gray-500 mt-1">
              As of {sheet.period.name} &mdash; {sheet.period.start_date} to {sheet.period.end_date}
            </p>
          </div>

          <table className="w-full text-sm border-collapse">
            <tbody>
              {sheet.sections && Object.entries(sheet.sections).map(([name, accounts]) => {
                const total = name === 'Assets' ? sheet.total_assets
                  : name === 'Liabilities' ? sheet.total_liabilities
                  : sheet.total_equity;
                return (
                  <tr key={name}>
                    <td colSpan={2} className="p-0">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td colSpan={2} className="text-sm font-bold text-gray-800 uppercase tracking-wider pt-4 pb-1">{name}</td>
                          </tr>
                          {accounts.map((acc) => (
                            <tr key={acc.account_id}>
                              <td className="py-1 pr-4 pl-6 text-gray-600">{acc.code} - {acc.name}</td>
                              <td className="py-1 pl-4 text-right font-mono tabular-nums text-gray-800 w-36">{formatCurrency(acc.balance)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td className="py-2 pr-4 pl-6 font-semibold text-gray-900 border-t border-gray-300">Total {name}</td>
                            <td className="py-2 pl-4 text-right font-mono tabular-nums font-semibold text-gray-900 border-t border-gray-300">{formatCurrency(total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}

              <tr><td colSpan={2} className="h-4" /></tr>

              <tr>
                <td colSpan={2} className="p-0">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="text-sm font-semibold text-gray-900 border-t-2 border-gray-800 pt-3">Total Assets (A)</td>
                        <td className="text-sm font-semibold text-gray-900 border-t-2 border-gray-800 pt-3 text-right font-mono tabular-nums w-36">{formatCurrency(sheet.total_assets)}</td>
                      </tr>
                      <tr>
                        <td className="text-sm font-semibold text-gray-900 pt-1">Total Liabilities (L)</td>
                        <td className="text-sm font-semibold text-gray-900 pt-1 text-right font-mono tabular-nums">{formatCurrency(sheet.total_liabilities)}</td>
                      </tr>
                      <tr>
                        <td className="text-sm font-semibold text-gray-900 pb-1">Total Equity (E)</td>
                        <td className="text-sm font-semibold text-gray-900 pb-1 text-right font-mono tabular-nums">{formatCurrency(sheet.total_equity)}</td>
                      </tr>
                      <tr>
                        <td className={cn('text-sm font-bold pt-2 border-t-2 border-gray-800', sheet.is_balanced ? 'text-green-600' : 'text-red-500')}>
                          A = L + E
                        </td>
                        <td className={cn('text-sm font-bold pt-2 border-t-2 border-gray-800 text-right font-mono tabular-nums', sheet.is_balanced ? 'text-green-600' : 'text-red-500')}>
                          {formatCurrency(sheet.total_assets)} = {formatCurrency(sheet.total_liabilities + sheet.total_equity)}
                          {sheet.is_balanced ? ' ✅' : ' ⛔'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      ) : (
        <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>
      )}
    </div>
  );
}
