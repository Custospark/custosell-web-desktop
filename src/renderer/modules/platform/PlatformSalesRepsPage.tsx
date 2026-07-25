import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES_REPS } from '../../shared/api/endpoints/endpoints';
import { useToast } from '../../app/contexts/ToastContext';
import { Table } from '../../shared/components/tables/Table';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { Search, Plus, Users, TrendingUp, DollarSign } from 'lucide-react';

interface PlatformSalesRep {
  id: number;
  user_id: number;
  referral_code_id: number;
  commission_rate: string;
  commission_type: 'percentage' | 'flat';
  is_active: boolean;
  created_at: string;
  user?: { id: number; name: string; email: string };
  referral_code?: { id: number; code: string };
  total_commission?: number;
  pending_commission?: number;
  paid_commission?: number;
  total_referrals?: number;
  active_referrals?: number;
}

export default function PlatformSalesRepsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PlatformSalesRep | null>(null);
  const [form, setForm] = useState({ user_id: '', commission_rate: '', commission_type: 'percentage', is_active: true });

  const { data: reps = [], isLoading } = useQuery<PlatformSalesRep[]>({
    queryKey: ['platform', 'sales-reps'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(SALES_REPS.EARNINGS_ALL);
      return data.data ?? [];
    },
  });

  const filtered = reps.filter((r) =>
    r.user?.name?.toLowerCase().includes(search.toLowerCase())
    || r.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) {
        await axiosInstance.put(SALES_REPS.BY_ID(editing.id), payload);
      } else {
        await axiosInstance.post(SALES_REPS.BASE, payload);
      }
    },
    onSuccess: () => {
      showToast('success', editing ? 'Sales rep updated' : 'Sales rep created');
      queryClient.invalidateQueries({ queryKey: ['platform', 'sales-reps'] });
      setShowModal(false);
      setEditing(null);
      setForm({ user_id: '', commission_rate: '', commission_type: 'percentage', is_active: true });
    },
    onError: (err: Error) => {
      const axiosErr = err as AxiosError<{ message: string }>;
      showToast('error', axiosErr.response?.data?.message || 'Failed to save');
    },
  });

  const openEdit = (rep: PlatformSalesRep) => {
    setEditing(rep);
    setForm({
      user_id: String(rep.user_id),
      commission_rate: String(rep.commission_rate),
      commission_type: rep.commission_type,
      is_active: rep.is_active,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ user_id: '', commission_rate: '', commission_type: 'percentage', is_active: true });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Representatives</h1>
          <p className="mt-1 text-sm text-gray-500">Manage sales reps, their referral codes, and commission payouts.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Sales Rep
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Reps</p>
              <p className="text-xl font-semibold">{reps.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Commission Owed</p>
              <p className="text-xl font-semibold">
                {reps.reduce((s, r) => s + (r.pending_commission ?? 0), 0).toLocaleString('en-UG')} UGX
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid Out</p>
              <p className="text-xl font-semibold">
                {reps.reduce((s, r) => s + (r.paid_commission ?? 0), 0).toLocaleString('en-UG')} UGX
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <Table
          columns={[
            { key: 'user', header: 'Name', render: (r: PlatformSalesRep) => (
              <div>
                <p className="text-sm font-medium text-gray-900">{r.user?.name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500">{r.user?.email}</p>
              </div>
            )},
            { key: 'code', header: 'Referral Code', render: (r: PlatformSalesRep) => (
              <span className="font-mono text-sm font-medium text-blue-700">{r.referral_code?.code ?? '—'}</span>
            )},
            { key: 'rate', header: 'Commission', align: 'center', render: (r: PlatformSalesRep) => (
              <span className="text-sm text-gray-900">
                {r.commission_type === 'percentage' ? `${r.commission_rate}%` : `${Number(r.commission_rate).toLocaleString('en-UG')} UGX`}
              </span>
            )},
            { key: 'referrals', header: 'Referrals', align: 'center', render: (r: PlatformSalesRep) => (
              <span className="text-sm text-gray-900">{r.total_referrals ?? 0}</span>
            )},
            { key: 'pending', header: 'Pending', align: 'right', render: (r: PlatformSalesRep) => (
              <span className="text-sm font-medium text-amber-700">
                {(r.pending_commission ?? 0) > 0 ? `${(r.pending_commission ?? 0).toLocaleString('en-UG')} UGX` : '—'}
              </span>
            )},
            { key: 'paid', header: 'Paid Out', align: 'right', render: (r: PlatformSalesRep) => (
              <span className="text-sm text-green-700">
                {(r.paid_commission ?? 0) > 0 ? `${(r.paid_commission ?? 0).toLocaleString('en-UG')} UGX` : '—'}
              </span>
            )},
            { key: 'status', header: 'Active', align: 'center', render: (r: PlatformSalesRep) => (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {r.is_active ? 'Active' : 'Inactive'}
              </span>
            )},
            { key: 'actions', header: '', render: (r: PlatformSalesRep) => (
              <button onClick={() => openEdit(r)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                Edit
              </button>
            )},
          ]}
          data={filtered}
          loading={isLoading}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Sales Rep' : 'Add Sales Rep'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <input
              type="number"
              value={form.user_id}
              onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Commission Rate</label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                step="0.01"
                value={form.commission_rate}
                onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={form.commission_type === 'percentage' ? 'e.g. 10' : 'e.g. 50000'}
              />
              <select
                value={form.commission_type}
                onChange={(e) => setForm((f) => ({ ...f, commission_type: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="percentage">%</option>
                <option value="flat">Flat (UGX)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
