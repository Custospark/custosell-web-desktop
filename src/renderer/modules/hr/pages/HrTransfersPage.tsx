import { useMemo, useState } from 'react';
import { ArrowRightLeft, GitBranch, Plus, Search } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { cn } from '../../../shared/utils/cn';
import { useStaffTransfers } from '../../settings/api/settings/StaffTransferQueries';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { useLocations } from '../../settings/api/settings/LocationQueries';
import { StaffBranchStatsSection } from '../../settings/ui/StaffBranchStatsSection';
import StaffTransferModal from '../../settings/ui/StaffTransferModal';
import { HrEmptyState, HrPageHeader } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status: string) {
  const classes = status === 'completed'
    ? 'bg-green-100 text-green-700'
    : status === 'pending'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', classes)}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function HrTransfersPage() {
  const { data: transfers = [], isLoading, isError } = useStaffTransfers();
  const { data: staff } = useStaff();
  const { data: locations } = useLocations();
  const [search, setSearch] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter((t) =>
      t.user?.name?.toLowerCase().includes(q)
      || t.user?.email?.toLowerCase().includes(q)
      || t.from_location?.name?.toLowerCase().includes(q)
      || t.to_location?.name?.toLowerCase().includes(q)
      || t.reason?.toLowerCase().includes(q),
    );
  }, [transfers, search]);

  const paginated = usePagination(filtered, 15);

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={ArrowRightLeft}
        title="Staff Transfers"
        description="Move staff members between branches and keep a full audit trail of every transfer."
        actions={
          <Button onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New transfer
          </Button>
        }
      />

      <StaffBranchStatsSection
        staff={staff}
        locations={locations}
        transfers={transfers}
        isLoading={isLoading}
      />

      <div className={HR_SURFACE.toolbar}>
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff, branch, or reason…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><CustosellLoader /></div>
      ) : isError ? (
        <HrEmptyState
          icon={<ArrowRightLeft className="h-6 w-6" />}
          title="Could not load transfers"
          description="Staff transfers need an online connection. Check your network and try again."
        />
      ) : filtered.length === 0 ? (
        <HrEmptyState
          icon={<ArrowRightLeft className="h-6 w-6" />}
          title={search ? 'No transfers match' : 'No staff transfers yet'}
          description={search ? 'Try clearing your search.' : 'Transfer a staff member to another branch and it will be recorded here.'}
          action={!search ? (
            <Button onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> New transfer
            </Button>
          ) : undefined}
        />
      ) : (
        <div className={HR_SURFACE.tableWrap}>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Staff member</th>
                <th className="px-4 py-3">From branch</th>
                <th className="px-4 py-3">To branch</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.data.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.user?.name ?? `Staff #${t.user_id}`}</div>
                    {t.user?.email ? <div className="text-xs text-gray-500">{t.user.email}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-gray-600">
                      <GitBranch className="h-3.5 w-3.5 text-gray-400" />
                      {t.from_location?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-gray-900">
                      <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                      {t.to_location?.name ?? `Branch #${t.to_location_id}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{t.transfer_type}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.effective_at)}</td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </div>
        </div>
      )}

      <StaffTransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}
