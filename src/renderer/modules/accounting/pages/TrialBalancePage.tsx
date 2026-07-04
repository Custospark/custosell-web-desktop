import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useTrialBalance, useAccountingPeriods } from '../api/AccountingQueries';
import { Printer, Scale, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function TrialBalancePage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const { data: tb, isLoading, isError } = useTrialBalance(periodId ? Number(periodId) : undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Trial Balance</h1>
            <p className="text-sm text-gray-500">Verify debit and credit balances</p>
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
        <Card><p className="text-sm text-red-500">Failed to load trial balance.</p></Card>
      ) : tb ? (
        <Card className="print:shadow-none print:border-none print:rounded-none print:p-0">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Custosell</h2>
            <h3 className="text-xl font-semibold text-gray-800 mt-1">Trial Balance</h3>
            <p className="text-sm text-gray-500 mt-1">
              {tb.period.name} &mdash; {tb.period.start_date} to {tb.period.end_date}
            </p>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 pr-2 font-semibold text-gray-700">Account</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Code</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Debit</th>
                <th className="text-right py-2 pl-2 font-semibold text-gray-700">Credit</th>
              </tr>
            </thead>
            <tbody>
              {tb.accounts.map((acc) => (
                <tr key={acc.account_id} className="border-b border-gray-200">
                  <td className="py-2 pr-2 text-gray-800">{acc.name}</td>
                  <td className="py-2 px-2 text-gray-500 font-mono">{acc.code}</td>
                  <td className="py-2 px-2 text-gray-500">{acc.type}</td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums">
                    {acc.debit_balance > 0 ? fmt(acc.debit_balance) : '-'}
                  </td>
                  <td className="py-2 pl-2 text-right font-mono tabular-nums">
                    {acc.credit_balance > 0 ? fmt(acc.credit_balance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 font-semibold">
                <td colSpan={3} className="py-3 pr-2 text-gray-900 text-right">Totals</td>
                <td className="py-3 px-2 text-right font-mono tabular-nums text-gray-900">{fmt(tb.total_debits)}</td>
                <td className="py-3 pl-2 text-right font-mono tabular-nums text-gray-900">{fmt(tb.total_credits)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 flex items-center justify-between text-sm border-t border-gray-200 pt-4">
            <span className="text-gray-500">
              Difference: <strong className="text-gray-900">{fmt(Math.abs(tb.total_debits - tb.total_credits))}</strong>
            </span>
            <span className={cn('inline-flex items-center gap-1.5 font-medium', tb.is_balanced ? 'text-green-600' : 'text-red-500')}>
              {tb.is_balanced ? <><CheckCircle className="w-4 h-4" /> Balanced</> : <><XCircle className="w-4 h-4" /> Not Balanced</>}
            </span>
          </div>
        </Card>
      ) : (
        <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>
      )}
    </div>
  );
}
