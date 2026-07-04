import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Input } from '../../../shared/components/inputs/Input';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useFixedAssets, useCreateFixedAsset } from '../api/AccountingQueries';
import type { FixedAsset } from '../api/AccountingTypes';
import { Building2, Plus, Play } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  disposed: 'bg-red-100 text-red-700',
  fully_depreciated: 'bg-gray-100 text-gray-600',
};

export default function FixedAssetsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: assets, isLoading } = useFixedAssets();
  const createAsset = useCreateFixedAsset();

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
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
      key: 'useful_life_months',
      header: 'Life (months)',
      render: (item: FixedAsset) => `${item.useful_life_months} months`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: FixedAsset) => (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColors[item.status] ?? 'bg-gray-100 text-gray-500')}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Fixed Assets</h1>
              <p className="text-sm text-gray-500">Manage fixed assets and depreciation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Play className="w-4 h-4 mr-1.5" />Run Depreciation
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Asset
            </Button>
          </div>
        </div>
      </Card>

      <Table columns={columns} data={assets ?? []} loading={isLoading} rowKey={(item) => item.id} />

      {formOpen && (
        <AddAssetForm
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => {
            createAsset.mutate(data, { onSuccess: () => setFormOpen(false) });
          }}
          loading={createAsset.isPending}
        />
      )}
    </div>
  );
}

function AddAssetForm({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<FixedAsset>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [salvageValue, setSalvageValue] = useState('');
  const [usefulLife, setUsefulLife] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      cost: Number(cost),
      salvage_value: Number(salvageValue),
      useful_life_months: Number(usefulLife),
      purchase_date: purchaseDate,
      account_id: 0,
      status: 'active',
      book_value: Number(cost),
      notes: null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Add Fixed Asset</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Asset Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} required />
          <Input label="Salvage Value" type="number" step="0.01" min="0" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} required />
          <Input label="Useful Life (months)" type="number" min="1" value={usefulLife} onChange={(e) => setUsefulLife(e.target.value)} required />
          <Input label="Purchase Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
