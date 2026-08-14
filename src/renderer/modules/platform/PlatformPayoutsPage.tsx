import { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePayables } from './api/PlatformPayoutQueries';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { ChartContainer } from '../../shared/components/charts/ChartContainer';
import { formatAxisCurrency, ChartTooltipShell, ChartTooltipRow } from '../../shared/components/charts/chartPrimitives';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { formatUSD } from '../../shared/utils/formatCurrency';
import {
  DollarSign, CalendarDays, Wallet, Users, AlertTriangle, TrendingUp, PieChart as PieIcon,
} from 'lucide-react';
import PlatformRecordPayoutModal from './PlatformRecordPayoutModal';
import PlatformPayoutScheduleModal from './PlatformPayoutScheduleModal';
import PlatformPayoutHistoryModal from './PlatformPayoutHistoryModal';
import type { PayableEntity } from './api/PlatformPayoutTypes';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', quarterly: 'Quarterly',
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'sales_rep', label: 'Sales Reps' },
  { value: 'user', label: 'Users' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Has Due' },
  { value: 'paid', label: 'Fully Paid' },
  { value: 'overdue', label: 'Overdue Schedule' },
] as const;

const PIE_COLORS = ['#7c3aed', '#2563eb'];

const cardStyles = {
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10' },
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10' },
  red: { border: 'border-red-500', shadow: 'hover:shadow-red-500/20', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700', glow: 'bg-red-500/10' },
};

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

  const topPayees = useMemo(() => {
    return [...payables]
      .filter((p) => p.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10)
      .map((p) => ({ name: p.name.split(' ')[0], pending: p.pending }));
  }, [payables]);

  const typeDistribution = useMemo(() => {
    const salesRepTotal = payables.filter((p) => p.type === 'sales_rep').reduce((s, p) => s + p.pending, 0);
    const userTotal = payables.filter((p) => p.type === 'user').reduce((s, p) => s + p.pending, 0);
    return [
      { name: 'Sales Reps', value: salesRepTotal },
      { name: 'Users', value: userTotal },
    ];
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
        <p className="text-sm text-gray-500 mt-1">Manage payouts for sales reps and referral rewards</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Due', key: 'totalPending' as const, icon: DollarSign, color: 'amber' as const, badge: 'Awaiting', format: true, val: stats.totalPending },
          { label: 'Total Paid', key: 'totalPaid' as const, icon: Wallet, color: 'green' as const, badge: 'Lifetime', format: true, val: stats.totalPaid },
          { label: 'Active Payees', key: 'activePayees' as const, icon: Users, color: 'blue' as const, badge: 'Owed', format: false, val: stats.activePayees, sub: `of ${payables.length} total` },
          { label: 'Overdue Schedules', key: 'overdue' as const, icon: AlertTriangle, color: 'red' as const, badge: 'Past due', format: false, val: stats.overdue },
        ].map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          const value = card.format ? formatUSD(card.val) : String(card.val);
          return (
            <div key={card.key}
              className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 border-2 bg-gradient-to-br from-white to-${card.color}-50/50 ${s.border} ${s.shadow} hover:-translate-y-0.5 group min-h-[120px] flex flex-col justify-center`}>
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
              <div className="flex items-center justify-between mb-3 relative">
                <div className={`p-3 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{card.badge}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 relative">{value}</p>
              <p className="text-sm text-gray-500 relative">{card.label}</p>
              {'sub' in card && card.sub && <p className="text-xs text-gray-400 relative mt-0.5">{card.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">Top Payees by Due Amount</h3>
            {topPayees.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">Top {topPayees.length}</span>
            )}
          </div>
          {topPayees.length > 0 ? (
            <ChartContainer className="h-64" minHeight={256}>
              {() => (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart data={topPayees} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <ChartTooltipShell title={d.name}>
                            <ChartTooltipRow label="Due" value={formatUSD(d.pending)} accent />
                          </ChartTooltipShell>
                        );
                      }}
                    />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">No due amounts</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800">Due by Type</h3>
          </div>
          {typeDistribution.some((d) => d.value > 0) ? (
            <ChartContainer className="h-64" minHeight={256}>
              {() => (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <PieChart>
                    <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {typeDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        return (
                          <ChartTooltipShell title={String(d.name)}>
                            <ChartTooltipRow label="Pending" value={formatUSD(d.value as number)} accent />
                          </ChartTooltipShell>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">No due amounts</div>
          )}
          <div className="flex justify-center gap-6 mt-3">
            {typeDistribution.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {payables.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-full sm:flex-1">
              <SearchInput
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              {TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
        )}

        {filtered.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'index', header: '#',
                  render: (_r: PayableEntity, idx: number) => (
                    <span className="text-sm text-gray-400">{idx + 1}</span>
                  ),
                },
                {
                  key: 'name', header: 'Payee',
                  render: (r: PayableEntity) => (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.name}
                        {r.code && <span className="text-xs text-gray-400 ml-1">({r.code})</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-400">
                        {r.email && <span>{r.email}</span>}
                        {r.phone && <span>{r.phone}</span>}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'type', header: 'Type',
                  render: (r: PayableEntity) => (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'sales_rep' ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                      {r.type === 'sales_rep' ? 'Sales Rep' : 'User'}
                    </span>
                  ),
                },
                { key: 'total_earned', header: 'Earned', align: 'right', render: (r: PayableEntity) => <span className="text-sm font-medium text-gray-900">{formatUSD(r.total_earned)}</span> },
                { key: 'total_paid', header: 'Paid', align: 'right', render: (r: PayableEntity) => <span className="text-sm text-gray-600">{formatUSD(r.total_paid)}</span> },
                {
                  key: 'pending', header: 'Due', align: 'right',
                  render: (r: PayableEntity) => (
                    <span className={`text-sm font-semibold ${r.pending > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      {formatUSD(r.pending)}
                    </span>
                  ),
                },
                { key: 'last_payout_at', header: 'Last Payout', render: (r: PayableEntity) => (
                  <span className="text-xs text-gray-500">
                    {r.last_payout_at ? new Date(r.last_payout_at).toLocaleDateString('en-UG') : '-'}
                  </span>
                )},
                {
                  key: 'schedule', header: 'Schedule',
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
                  key: 'actions', header: 'Actions',
                  render: (r: PayableEntity) => (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setHistoryFor(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="View history">
                        <Wallet className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setScheduleFor(r)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="Edit schedule">
                        <CalendarDays className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setRecordFor(r)} disabled={r.pending <= 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-amber-50 text-amber-700 hover:bg-amber-100">
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
                ? 'No payables match your filters' : 'No due payables'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Sales rep commissions and referral rewards will appear here</p>
          </div>
        )}
      </div>

      {recordFor && <PlatformRecordPayoutModal entity={recordFor} onClose={() => setRecordFor(null)} />}
      {scheduleFor && <PlatformPayoutScheduleModal entity={scheduleFor} onClose={() => setScheduleFor(null)} />}
      {historyFor && <PlatformPayoutHistoryModal entity={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}
