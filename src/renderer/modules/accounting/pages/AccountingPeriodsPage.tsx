import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';

import { useAccountingPeriods, useClosePeriod } from '../api/AccountingQueries';
import type { AccountingPeriod } from '../api/AccountingTypes';
import { Calendar, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export default function AccountingPeriodsPage() {
  const { data: periods, isLoading } = useAccountingPeriods();
  const closePeriod = useClosePeriod();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'start_date', header: 'Start Date' },
    { key: 'end_date', header: 'End Date' },
    {
      key: 'is_closed',
      header: 'Status',
      render: (item: AccountingPeriod) => (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          item.is_closed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700')}>
          {item.is_closed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {item.is_closed ? 'Closed' : 'Open'}
        </span>
      ),
    },
    {
      key: 'closed_by',
      header: 'Closed By',
      render: (item: AccountingPeriod) => item.closed_by ?? '-',
    },
    {
      key: 'closed_at',
      header: 'Closed At',
      render: (item: AccountingPeriod) => item.closed_at ? new Date(item.closed_at).toLocaleString() : '-',
    },
    {
      key: 'actions',
      header: '',
      render: (item: AccountingPeriod) =>
        !item.is_closed && (
          <Button size="sm" variant="outline" onClick={() => setConfirmId(item.id)}>
            <Lock className="w-3 h-3 mr-1" />Close
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Accounting Periods</h1>
            <p className="text-sm text-gray-500">Manage accounting periods and closings</p>
          </div>
        </div>
      </Card>

      <Table columns={columns} data={periods ?? []} loading={isLoading} rowKey={(item) => item.id} />

      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Close Period</h2>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to close this accounting period? This action is irreversible and will lock all journal entries in this period.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={closePeriod.isPending}
                onClick={() => {
                  closePeriod.mutate(confirmId, {
                    onSuccess: () => setConfirmId(null),
                  });
                }}
              >
                Close Period
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
