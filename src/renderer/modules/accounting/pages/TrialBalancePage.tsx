import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Table } from '../../../shared/components/tables/Table';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useTrialBalance, useAccountingPeriods } from '../api/AccountingQueries';
import type { TrialBalanceAccount } from '../api/AccountingTypes';
import { Scale, Download, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { Button } from '../../../shared/components/buttons/Button';

export default function TrialBalancePage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const { data: trialBalance, isLoading } = useTrialBalance(periodId ? Number(periodId) : undefined);

  const columns = [
    { key: 'code', header: 'Account Code' },
    { key: 'name', header: 'Account Name' },
    { key: 'type', header: 'Type' },
    {
      key: 'debit_balance',
      header: 'Debit Balance',
      align: 'right' as const,
      render: (item: TrialBalanceAccount) => item.debit_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    {
      key: 'credit_balance',
      header: 'Credit Balance',
      align: 'right' as const,
      render: (item: TrialBalanceAccount) => item.credit_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Trial Balance</h1>
              <p className="text-sm text-gray-500">Verify debit and credit balances</p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1.5" />Export
          </Button>
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

      {isLoading ? <LoadingSpinner /> : trialBalance && (
        <>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Period: <span className="font-medium text-gray-900">{trialBalance.period.name}</span></p>
                <p className="text-sm text-gray-500">{trialBalance.period.start_date} — {trialBalance.period.end_date}</p>
              </div>
              <div className="flex items-center gap-2">
                {trialBalance.is_balanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                    <XCircle className="w-4 h-4" /> Unbalanced
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Table columns={columns} data={trialBalance.accounts} rowKey={(item) => item.account_id} />

          <Card className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Total Debits: <strong className="text-gray-900">{trialBalance.total_debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-gray-500">
              Total Credits: <strong className="text-gray-900">{trialBalance.total_credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className={cn('font-medium', trialBalance.is_balanced ? 'text-green-600' : 'text-red-500')}>
              {trialBalance.is_balanced ? 'Balanced ✓' : 'Unbalanced ✗'}
            </span>
          </Card>
        </>
      )}
    </div>
  );
}
