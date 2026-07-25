import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES_REPS, USERS } from '../../shared/api/endpoints/endpoints';
import { useToast } from '../../app/contexts/ToastContext';
import { Table } from '../../shared/components/tables/Table';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { Search, Plus, Users, TrendingUp, DollarSign, Mail, UserCheck, UserPlus } from 'lucide-react';

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

interface SalesRepForm {
  email: string;
  name: string;
  commission_rate: string;
  commission_type: 'percentage' | 'flat';
  is_active: boolean;
}

export default function PlatformSalesRepsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PlatformSalesRep | null>(null);
  const [form, setForm] = useState<SalesRepForm>({ email: '', name: '', commission_rate: '', commission_type: 'percentage', is_active: true });
  const [searchedUser, setSearchedUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

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

  const doSearch = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSearching(true);
    setSearchedUser(null);
    try {
      const { data } = await axiosInstance.get(USERS.LOOKUP, { params: { email } });
      const u = data?.data?.user;
      if (u) {
        setSearchedUser(u);
        setForm((f) => ({ ...f, name: u.name }));
      }
    } catch {
      setSearchedUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setForm((f) => ({ ...f, email }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (email.includes('@')) {
      searchTimeout.current = setTimeout(() => doSearch(email), 600);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await axiosInstance.put(SALES_REPS.BY_ID(editing.id), {
          commission_rate: form.commission_rate,
          commission_type: form.commission_type,
          is_active: form.is_active,
        });
      } else {
        await axiosInstance.post(SALES_REPS.BASE, {
          email: form.email,
          name: form.name || undefined,
          commission_rate: form.commission_rate,
          commission_type: form.commission_type,
          is_active: form.is_active,
        });
      }
    },
    onSuccess: () => {
      showToast('success', editing ? 'Sales rep updated' : 'Sales rep created');
      queryClient.invalidateQueries({ queryKey: ['platform', 'sales-reps'] });
      setShowModal(false);
      setEditing(null);
      setForm({ email: '', name: '', commission_rate: '', commission_type: 'percentage', is_active: true });
      setSearchedUser(null);
    },
    onError: (err: Error) => {
      const axiosErr = err as AxiosError<{ message: string }>;
      showToast('error', axiosErr.response?.data?.message || 'Failed to save');
    },
  });

  const openEdit = (rep: PlatformSalesRep) => {
    setEditing(rep);
    setForm({
      email: rep.user?.email ?? '',
      name: rep.user?.name ?? '',
      commission_rate: String(rep.commission_rate),
      commission_type: rep.commission_type,
      is_active: rep.is_active,
    });
    setSearchedUser(rep.user ?? null);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', name: '', commission_rate: '', commission_type: 'percentage', is_active: true });
    setSearchedUser(null);
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
          {editing ? (
            // Edit mode: read-only user info + editable commission
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{editing.user?.name}</p>
                  <p className="text-xs text-gray-500">{editing.user?.email}</p>
                </div>
              </div>
            </div>
          ) : (
            // Create mode: email search + registration
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="mt-1 flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="rep@example.com"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => doSearch(form.email)}
                  disabled={searching || !form.email}
                >
                  {searching ? '...' : 'Search'}
                </Button>
              </div>

              {/* Search result */}
              {searching && (
                <p className="mt-2 text-xs text-gray-500">Looking up user...</p>
              )}

              {searchedUser && !searching && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{searchedUser.name}</p>
                    <p className="text-xs text-green-600">{searchedUser.email}</p>
                    <p className="text-xs text-green-500">Existing user found — will be added as a sales rep</p>
                  </div>
                </div>
              )}

              {!searching && form.email && !searchedUser && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-xs text-amber-700">No user found with this email.</p>
                    <p className="text-xs text-amber-600">A new account will be created for this sales rep.</p>
                  </div>
                </div>
              )}

              {/* Name field — editable for new users, pre-filled for found */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={searchedUser ? searchedUser.name : 'Sales rep name'}
                />
              </div>
            </div>
          )}

          {/* Commission Fields */}
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
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (!editing && !form.email)}
            >
              {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
