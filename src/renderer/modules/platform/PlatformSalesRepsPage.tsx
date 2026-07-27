import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES_REPS } from '../../shared/api/endpoints/endpoints';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { useToast } from '../../app/contexts/useToast';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { Search, Plus, Users, TrendingUp, DollarSign, Upload, Trash2 } from 'lucide-react';
import { SalesRepFormModal } from './PlatformSalesRepFormModal';
import { SalesRepPayoutModal } from './SalesRepPayoutModal';
import SalesRepImportModal from './SalesRepImportModal';
import type { PlatformSalesRep } from './PlatformSalesRepFormModal';

export default function PlatformSalesRepsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editing, setEditing] = useState<PlatformSalesRep | null>(null);
  const [payoutRep, setPayoutRep] = useState<PlatformSalesRep | null>(null);

  const { data: reps = [], isLoading } = useQuery<PlatformSalesRep[]>({
    queryKey: ['platform', 'sales-reps'],
    queryFn: async () => {
      const { data } = await axiosInstance.get(SALES_REPS.EARNINGS_ALL);
      return data.data ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const filtered = reps.filter((r) =>
    r.user?.name?.toLowerCase().includes(search.toLowerCase())
    || r.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['platform', 'sales-reps'] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosInstance.delete(SALES_REPS.BY_ID(id)),
    onSuccess: () => {
      showToast('success', 'Sales rep deleted');
      refetch();
    },
    onError: () => {
      showToast('error', 'Failed to delete sales rep');
    },
  });

  const handleDelete = async (r: PlatformSalesRep) => {
    const confirmed = await confirm({
      title: 'Delete sales rep',
      message: `Permanently delete "${r.user?.name ?? r.user?.email}"? Their referral code will be deactivated and this cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(r.id);
  };

  const totalOwed = reps.reduce((s, r) => s + (r.pending_commission ?? 0), 0);
  const totalPaid = reps.reduce((s, r) => s + (r.paid_commission ?? 0), 0);
  const activeCount = reps.filter((r) => r.is_active).length;
  const page = usePagination(filtered, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Representatives</h1>
          <p className="mt-1 text-sm text-gray-500">Manage sales reps, their referral codes, and commission payouts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button onClick={() => { setEditing(null); setShowFormModal(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Sales Rep
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Reps</p>
              <p className="text-2xl font-bold text-gray-900">{reps.length}</p>
              <p className="text-xs text-gray-400">{activeCount} active</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Commission Owed</p>
              <p className="text-2xl font-bold text-gray-900">{formatUSD(totalOwed)}</p>
              <p className="text-xs text-gray-400">due payouts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Paid Out</p>
              <p className="text-2xl font-bold text-gray-900">{formatUSD(totalPaid)}</p>
              <p className="text-xs text-gray-400">lifetime</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
            {filtered.length < reps.length && (
              <span className="shrink-0 text-xs font-medium tabular-nums text-gray-500">
                {filtered.length} / {reps.length}
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                {r.commission_type === 'percentage' ? `${r.commission_rate}%` : formatUSD(r.commission_rate)}
              </span>
            )},
            { key: 'referrals', header: 'Referrals', align: 'center', render: (r: PlatformSalesRep) => (
              <span className="text-sm text-gray-900">{r.total_referrals ?? 0}</span>
            )},
            { key: 'pending', header: 'Due', align: 'right', render: (r: PlatformSalesRep) => (
              <span className="text-sm font-medium text-amber-700">
                {(r.pending_commission ?? 0) > 0 ? formatUSD(r.pending_commission ?? 0) : '—'}
              </span>
            )},
            { key: 'paid', header: 'Paid Out', align: 'right', render: (r: PlatformSalesRep) => (
              <span className="text-sm text-green-700">
                {(r.paid_commission ?? 0) > 0 ? formatUSD(r.paid_commission ?? 0) : '—'}
              </span>
            )},
            { key: 'status', header: 'Active', align: 'center', render: (r: PlatformSalesRep) => (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {r.is_active ? 'Active' : 'Inactive'}
              </span>
            )},
            { key: 'actions', header: 'Actions', render: (r: PlatformSalesRep) => (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(r); setShowFormModal(true); }} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Edit
                </button>
                <button onClick={() => setPayoutRep(r)} className="text-sm font-medium text-green-600 hover:text-green-800">
                  Payouts
                </button>
                <button onClick={() => handleDelete(r)} disabled={deleteMutation.isPending} className="text-sm font-medium text-red-600 hover:text-red-800" title="Delete sales rep">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )},
          ]}
          data={page.data}
          loading={isLoading}
        />
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination
            currentPage={page.page}
            totalPages={page.totalPages}
            totalItems={page.totalItems}
            pageSize={page.pageSize}
            onPageChange={page.setPage}
            onPageSizeChange={page.setPageSize}
          />
        </div>
      </div>

      <SalesRepFormModal
        key={editing?.id ?? 'new'}
        show={showFormModal}
        editing={editing}
        onClose={(refetch_) => {
          setShowFormModal(false);
          setEditing(null);
          if (refetch_) refetch();
        }}
      />

      <SalesRepPayoutModal
        rep={payoutRep}
        onClose={() => { setPayoutRep(null); refetch(); }}
      />

      <SalesRepImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => { setShowImportModal(false); refetch(); }}
      />
    </div>
  );
}
