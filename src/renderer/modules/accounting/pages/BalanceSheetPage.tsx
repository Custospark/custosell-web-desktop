import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useBalanceSheet, useAccountingPeriods } from '../api/AccountingQueries';
import { BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

function SectionTable({ title, accounts, total }: { title: string; accounts: { account_id: number; code: string; name: string; balance: number }[]; total: number }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-1">
        {accounts.map((acc) => (
          <div key={acc.account_id} className="flex items-center justify-between py-1.5 text-sm pl-4 text-gray-600">
            <span>{acc.code} - {acc.name}</span>
            <span className="font-mono">{acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 border-t border-gray-200 font-semibold text-gray-900 mt-1">
          <span>Total {title}</span>
          <span className="font-mono">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const { data: sheet, isLoading } = useBalanceSheet(periodId ? Number(periodId) : undefined);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Balance Sheet</h1>
            <p className="text-sm text-gray-500">Financial position overview</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-4 items-center">
        <Select
          label="Period"
          options={[
            { value: '', label: 'All Periods' },
            ...(periods ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? <LoadingSpinner /> : sheet && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                Period: <span className="font-medium text-gray-900">{sheet.period.name}</span>
                &nbsp;({sheet.period.start_date} — {sheet.period.end_date})
              </div>
              <div className="flex items-center gap-2">
                {sheet.is_balanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> A = L + E
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                    <XCircle className="w-4 h-4" /> Not Balanced
                  </span>
                )}
              </div>
            </div>

            {sheet.sections && Object.entries(sheet.sections).map(([name, accounts]) => {
              const total = name === 'Assets' ? sheet.total_assets
                : name === 'Liabilities' ? sheet.total_liabilities
                : sheet.total_equity;
              return (
                <SectionTable key={name} title={name} accounts={accounts} total={total} />
              );
            })}
          </Card>

          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="font-semibold text-gray-900">Total Assets (A)</span>
                <span className="font-mono font-semibold">
                  {sheet.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="font-semibold text-gray-900">Total Liabilities (L)</span>
                <span className="font-mono font-semibold">
                  {sheet.total_liabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="font-semibold text-gray-900">Total Equity (E)</span>
                <span className="font-mono font-semibold">
                  {sheet.total_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-200 font-semibold text-gray-900">
                <span>A = L + E</span>
                <span className={cn('font-mono', sheet.is_balanced ? 'text-green-600' : 'text-red-500')}>
                  {sheet.total_assets.toLocaleString(undefined, { minimumFractionDigits: 2 })} = {(sheet.total_liabilities + sheet.total_equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
