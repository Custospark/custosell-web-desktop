import { useMemo, useState } from 'react';
import { usePayables } from './api/PlatformPayoutQueries';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { DollarSign, CalendarDays, Wallet, Users, AlertTriangle } from 'lucide-react';
import PlatformRecordPayoutModal from './PlatformRecordPayoutModal';
import PlatformPayoutScheduleModal from './PlatformPayoutScheduleModal';
import PlatformPayoutHistoryModal from './PlatformPayoutHistoryModal';
import type { PayableEntity } from './api/PlatformPayoutTypes';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'sales_rep', label: 'Sales Reps' },
  { value: 'user', label: 'Users' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Has Pending' },
  { value: 'paid', label: 'Fully Paid' },
  { value: 'overdue', label: 'Overdue Schedule' },
] as const;

function matchesPayable(p: PayableEntity, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
    p.name.toLowerCase().includes(q) ||
    (p.email ?? '').toLowerCase().includes(q) ||
    (p.phone ?? '').toLowerCase().includes(q)
  );
}

export default function PlatformPayoutsPage() {
  const { data: payables = [], isLoading } = usePayables();
  const [recordFor, setRecordFor] = useState<PayableEntity | null>(null);
  const [scheduleFor, setScheduleFor] = useState<PayableEntity | null>(null);
  const [historyFor, setHistoryFor] = useState<PayableEntity | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const stats = useMemo(() => {
    const totalPending = payables.reduce((s, p) => s + p.pending, 0);
    const totalPaid = payables.reduce((s, p) => s + p.total_paid, 0);
    const activePayees = payables.filter((p) => p.pending > 0).length;
    const now = new Date();
    const overdue = payables.filter((p) => {
      if (p.pending <= 0 || !p.next_payout_at) return false;
      return new Date(p.next_payout_at) < now;
    }).length;
    return { totalPending, totalPaid, activePayees, overdue };
  }, [payables]);

  const filtered = useMemo(() => {
    return payables.filter((p) => {
      if (!matchesPayable(p, search)) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (statusFilter === 'pending' && p.pending <= 0) return false;
      if (statusFilter === 'paid' && p.pending > 0) return false;
      if (statusFilter === 'overdue') {
        if (p.pending <= 0 || !p.next_payout_at) return false;
        if (new Date(p.next_payout_at) >= new Date()) return false;
      }
      return true;
    });
  }, [payables, search, typeFilter, statusFilter]);

  const paginated = usePagination(filtered, 10);

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage payouts for sales reps and referral rewards
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Pending</p>
            <div className="p-2 rounded-lg bg-amber-50">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatUSD(stats.totalPending)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.activePayees} payees with pending</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Paid</p>
            <div className="p-2 rounded-lg bg-green-50">
              <Wallet className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatUSD(stats.totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">Lifetime payouts</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active Payees</p>
            <div className="p-2 rounded-lg bg-blue-50">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activePayees}</p>
          <p className="text-xs text-gray-400 mt-1">of {payables.length} total payees</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Overdue Schedules</p>
            <div className={`p-2 rounded-lg ${stats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-4 h-4 ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${stats.overdue > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {stats.overdue}
          </p>
          <p className="text-xs text-gray-400 mt-1">Past scheduled payout date</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {payables.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {filtered.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'name',
                  header: 'Payee',
                  render: (r: PayableEntity) => (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.name}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-400">
                        {r.email && <span>{r.email}</span>}
                        {r.phone && <span>{r.phone}</span>}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (r: PayableEntity) => (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'sales_rep' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                      {r.type === 'sales_rep' ? 'Sales Rep' : 'User'}
                    </span>
                  ),
                },
                {
                  key: 'total_earned',
                  header: 'Earned',
                  align: 'right',
                  render: (r: PayableEntity) => (
                    <span className="text-sm font-medium text-gray-900">{formatUSD(r.total_earned)}</span>
                  ),
                },
                {
                  key: 'total_paid',
                  header: 'Paid',
                  align: 'right',
                  render: (r: PayableEntity) => (
                    <span className="text-sm text-gray-600">{formatUSD(r.total_paid)}</span>
                  ),
                },
                {
                  key: 'pending',
                  header: 'Pending',
                  align: 'right',
                  render: (r: PayableEntity) => (
                    <span className={`text-sm font-semibold ${r.pending > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      {formatUSD(r.pending)}
                    </span>
                  ),
                },
                {
                  key: 'last_payout_at',
                  header: 'Last Payout',
                  render: (r: PayableEntity) => (
                    <span className="text-xs text-gray-500">
                      {r.last_payout_at ? new Date(r.last_payout_at).toLocaleDateString('en-UG') : '—'}
                    </span>
                  ),
                },
                {
                  key: 'schedule',
                  header: 'Schedule',
                  render: (r: PayableEntity) => {
                    if (!r.payout_frequency) return <span className="text-xs text-gray-400">None</span>;
                    const isOverdue = r.next_payout_at && new Date(r.next_payout_at) < new Date() && r.pending > 0;
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-600">{FREQUENCY_LABELS[r.payout_frequency] ?? r.payout_frequency}</span>
                        {r.next_payout_at && (
                          <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                            {new Date(r.next_payout_at).toLocaleDateString('en-UG')}
                          </span>
                        )}
                        {isOverdue && <span className="text-[10px] text-red-600 font-bold">OVERDUE</span>}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r: PayableEntity) => (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryFor(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View history"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleFor(r)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit schedule"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordFor(r)}
                        disabled={r.pending <= 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Pay
                      </button>
                    </div>
                  ),
                },
              ]}
              data={paginated.data}
              rowKey={(r: PayableEntity) => `${r.type}-${r.id}`}
            />
            <div className="px-5 pb-4">
              <Pagination
                currentPage={paginated.page}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                pageSize={paginated.pageSize}
                onPageChange={paginated.setPage}
                onPageSizeChange={paginated.setPageSize}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No payables match your filters'
                : 'No pending payables'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Sales rep commissions and referral rewards will appear here
            </p>
          </div>
        )}
      </div>

      {recordFor && (
        <PlatformRecordPayoutModal
          entity={recordFor}
          onClose={() => setRecordFor(null)}
        />
      )}
      {scheduleFor && (
        <PlatformPayoutScheduleModal
          entity={scheduleFor}
          onClose={() => setScheduleFor(null)}
        />
      )}
      {historyFor && (
        <PlatformPayoutHistoryModal
          entity={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}
