import { useState } from 'react';
import { useCampaignCodes, useCreateCampaignCode, useDeleteCampaignCode } from './api/PlatformCampaignQueries';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Table } from '../../shared/components/tables/Table';
import { Plus, Percent, DollarSign, Gift, Trash2, Shuffle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CampaignCode } from './api/PlatformTypes';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CHARS[(Math.random() * CHARS.length) | 0];
  return code;
}

export default function PlatformCampaignCodesPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: codes, isLoading } = useCampaignCodes({ owner_type: 'campaign' });
  const createMutation = useCreateCampaignCode();
  const deleteMutation = useDeleteCampaignCode();
  const [newCode, setNewCode] = useState({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100, expires_at: '' });

  if (isLoading) return <LoadingSkeleton variant="table" />;

  const columns: { key: keyof CampaignCode | string; label: string; render?: (row: CampaignCode) => React.ReactNode }[] = [
    { key: 'code', label: 'Code', render: (r) => <span className="font-mono font-bold text-indigo-700">{r.code}</span> },
    { key: 'discount_type', label: 'Discount', render: (r) => (
      <span className="flex items-center gap-1 text-sm">
        {r.discount_type === 'percentage' ? <Percent className="w-3.5 h-3.5 text-green-600" /> : <DollarSign className="w-3.5 h-3.5 text-blue-600" />}
        {r.discount_type === 'percentage' ? `${r.discount_value}%` : r.discount_type === 'flat_amount' ? `$${r.discount_value}` : 'Free month'}
      </span>
    )},
    { key: 'usage_count', label: 'Used', render: (r) => <span className="text-sm font-medium">{(r as CampaignCode & { usage_count?: number }).usage_count ?? 0}{(r.max_uses ? ` / ${r.max_uses}` : '')}</span> },
    { key: 'is_active', label: 'Status', render: (r) => (
      r.is_active
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
    )},
    { key: 'expires_at', label: 'Expires', render: (r) => r.expires_at
      ? <span className="text-sm text-gray-500">{formatDistanceToNow(new Date(r.expires_at), { addSuffix: true })}</span>
      : <span className="text-sm text-gray-400">Never</span>
    },
    { key: 'created_at', label: 'Created', render: (r) => <span className="text-sm text-gray-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => deleteMutation.mutate(r.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Codes</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage promotional discount codes</p>
        </div>
        <Button type="button" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Campaign Code
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Create Campaign Code</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Code</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="e.g. FESTIVE20"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setNewCode({ ...newCode, code: generateCode() })}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  title="Generate random code"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Discount</label>
              <div className="flex gap-2 mt-1">
                <select
                  value={newCode.discount_type}
                  onChange={(e) => setNewCode({ ...newCode, discount_type: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="percentage">%</option>
                  <option value="flat_amount">Flat $</option>
                  <option value="free_month">Free Month</option>
                </select>
                {newCode.discount_type !== 'free_month' && (
                  <input
                    type="number"
                    value={newCode.discount_value}
                    onChange={(e) => setNewCode({ ...newCode, discount_value: Number(e.target.value) })}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Max uses</label>
              <input
                type="number"
                value={newCode.max_uses}
                onChange={(e) => setNewCode({ ...newCode, max_uses: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Expires at</label>
              <input
                type="datetime-local"
                value={newCode.expires_at}
                onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="button" onClick={() => {
              createMutation.mutate({
                code: newCode.code,
                owner_type: 'campaign',
                discount_type: newCode.discount_type,
                discount_value: newCode.discount_type !== 'free_month' ? newCode.discount_value : 0,
                max_uses: newCode.max_uses,
                expires_at: newCode.expires_at || null,
              });
              setShowForm(false);
              setNewCode({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100, expires_at: '' });
            }} loading={createMutation.isPending}>Create</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        {codes && codes.length > 0 ? (
          <Table columns={columns} rows={codes} />
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Gift className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No campaign codes yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first promotional code to offer discounts</p>
          </div>
        )}
      </div>
    </div>
  );
}
