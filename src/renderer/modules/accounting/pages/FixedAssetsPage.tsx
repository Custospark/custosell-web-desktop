import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { useFixedAssets, useCreateFixedAsset } from '../api/AccountingQueries';
import type { FixedAsset } from '../api/AccountingTypes';
import { Building2, Plus, Play, CalendarRange } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  AddFixedAssetForm,
  FixedAssetSchedulePanel,
  RunDepreciationModal,
} from './FixedAssetDepreciationPanels';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  disposed: 'bg-red-100 text-red-700',
  fully_depreciated: 'bg-gray-100 text-gray-600',
};

export default function FixedAssetsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [scheduleAsset, setScheduleAsset] = useState<FixedAsset | null>(null);
  const { data: assets, isLoading } = useFixedAssets();
  const createAsset = useCreateFixedAsset();

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (item: FixedAsset) => {
        const e = item.assigned_employee;
        if (!e || !item.assigned_employee_id) return <span className="text-gray-400">—</span>;
        return (
          <Link to={ROUTES.HR.EMPLOYEE(item.assigned_employee_id)} className="text-indigo-600 hover:underline">
            {e.first_name} {e.last_name}
          </Link>
        );
      },
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right' as const,
      render: (item: FixedAsset) => item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    {
      key: 'book_value',
      header: 'Book Value',
      align: 'right' as const,
      render: (item: FixedAsset) => item.book_value.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    {
      key: 'monthly_depreciation',
      header: 'Monthly Depr.',
      align: 'right' as const,
      render: (item: FixedAsset) => item.monthly_depreciation?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: FixedAsset) => (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusColors[item.status] ?? 'bg-gray-100 text-gray-500')}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: FixedAsset) => (
        <Button size="sm" variant="outline" onClick={() => setScheduleAsset(item)} className="inline-flex items-center gap-1">
          <CalendarRange className="h-3.5 w-3.5" /> Schedule
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Fixed Assets</h1>
              <p className="text-sm text-gray-500">Financial register, depreciation, and schedules</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setRunOpen(true)}>
              <Play className="mr-1.5 h-4 w-4" />Run Depreciation
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />Add Asset
            </Button>
          </div>
        </div>
      </Card>

      <Table columns={columns} data={assets ?? []} loading={isLoading} rowKey={(item) => item.id} />

      {formOpen && (
        <AddFixedAssetForm
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => {
            createAsset.mutate(data, { onSuccess: () => setFormOpen(false) });
          }}
          loading={createAsset.isPending}
        />
      )}

      <RunDepreciationModal open={runOpen} onClose={() => setRunOpen(false)} />
      <FixedAssetSchedulePanel asset={scheduleAsset} onClose={() => setScheduleAsset(null)} />
    </div>
  );
}
