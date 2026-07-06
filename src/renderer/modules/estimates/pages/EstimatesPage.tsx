import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { useToast } from '../../../app/contexts/useToast';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useEstimates,
  useSendEstimate,
  useDeleteEstimate,
  useDuplicateEstimate,
} from '../api/useEstimateQueries';
import type { Estimate } from '../api/estimateTypes';
import EstimateBuilderForm from './EstimateBuilderForm';
import EstimateStatusBadge, { displayEstimateStatus } from '../ui/EstimateStatusBadge';
import { viewEstimatePdf, downloadEstimatePdf } from '../useEstimatePdf';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import {
  FileSpreadsheet, Plus, Send, Download, Trash2, Search, Eye, Pencil, Copy,
} from 'lucide-react';

type EstimateView = 'list' | 'create' | 'edit';

function IconAction({
  title, onClick, loading, disabled, children, className,
}: {
  title: string; onClick: () => void; loading?: boolean; disabled?: boolean;
  children: ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors',
        'hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : children}
    </button>
  );
}

export default function EstimatesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<EstimateView>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyAction, setBusyAction] = useState<{ id: number; type: string } | null>(null);

  const { showToast } = useToast();
  const { data: estimates, isLoading } = useEstimates();
  const sendEstimate = useSendEstimate();
  const deleteEstimate = useDeleteEstimate();
  const duplicateEstimate = useDuplicateEstimate();

  const editingEstimate = useMemo(
    () => (editingId ? estimates?.find((e) => e.id === editingId) : undefined),
    [editingId, estimates],
  );

  const sorted = useMemo(() => {
    if (!estimates) return [];
    return [...estimates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [estimates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((est) => {
      const status = displayEstimateStatus(est.status, est.valid_until);
      if (statusFilter && status !== statusFilter) return false;
      if (q && !est.estimate_number.toLowerCase().includes(q)
        && !est.title.toLowerCase().includes(q)
        && !(est.customer?.name ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [sorted, search, statusFilter]);

  const paginated = usePagination(filtered, 15);

  const stats = useMemo(() => {
    const list = estimates ?? [];
    const drafts = list.filter((e) => e.status === 'draft').length;
    const pipelineValue = list
      .filter((e) => ['draft', 'sent'].includes(e.status))
      .reduce((sum, e) => sum + e.total, 0);
    const approved = list.filter((e) => e.status === 'approved').length;
    const avgMargin = list.length
      ? list.reduce((sum, e) => sum + e.margin_percent, 0) / list.length
      : 0;
    return { total: list.length, drafts, pipelineValue, approved, avgMargin };
  }, [estimates]);

  const handlePdfAction = useCallback(async (id: number, type: 'view' | 'download') => {
    setBusyAction({ id, type });
    try {
      if (type === 'view') await viewEstimatePdf(id);
      else await downloadEstimatePdf(id);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to open PDF');
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  const columns = useMemo(() => [
    {
      key: 'estimate_number',
      header: 'Estimate #',
      render: (item: Estimate) => (
        <Link to={ROUTES.ESTIMATES.DETAIL(item.id)} className="font-mono text-sm font-semibold text-blue-700 hover:underline">
          {item.estimate_number}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (item: Estimate) => <span className="text-sm text-gray-800">{item.title}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Estimate) => (
        <span className={cn('text-sm', item.customer?.name ? 'text-gray-800' : 'text-gray-400 italic')}>
          {item.customer?.name ?? 'No customer'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: Estimate) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {formatCurrency(item.total, item.currency)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Margin',
      render: (item: Estimate) => (
        <span className={cn(
          'text-sm font-medium tabular-nums',
          item.margin_percent >= 20 ? 'text-emerald-700' : 'text-amber-700',
        )}>
          {item.margin_percent.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Estimate) => (
        <EstimateStatusBadge status={displayEstimateStatus(item.status, item.valid_until)} />
      ),
    },
    {
      key: 'valid_until',
      header: 'Valid until',
      render: (item: Estimate) => (
        <span className="text-sm tabular-nums text-gray-600">
          {item.valid_until ? formatShiftDate(item.valid_until) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: Estimate) => {
        const isDraft = item.status === 'draft';
        const busy = (type: string) => busyAction?.id === item.id && busyAction.type === type;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <IconAction title="View" onClick={() => navigate(ROUTES.ESTIMATES.DETAIL(item.id))}>
              <Eye className="h-4 w-4" />
            </IconAction>
            {isDraft && (
              <IconAction
                title="Edit"
                onClick={() => { setEditingId(item.id); setView('edit'); }}
              >
                <Pencil className="h-4 w-4" />
              </IconAction>
            )}
            {isDraft && (
              <IconAction
                title="Send"
                onClick={() => sendEstimate.mutate(item.id)}
                loading={sendEstimate.isPending && sendEstimate.variables === item.id}
              >
                <Send className="h-4 w-4" />
              </IconAction>
            )}
            <IconAction title="Download PDF" onClick={() => handlePdfAction(item.id, 'download')} loading={busy('download')}>
              <Download className="h-4 w-4" />
            </IconAction>
            <IconAction
              title="Duplicate"
              onClick={() => duplicateEstimate.mutate(item.id)}
              loading={duplicateEstimate.isPending && duplicateEstimate.variables === item.id}
            >
              <Copy className="h-4 w-4" />
            </IconAction>
            {isDraft && (
              <IconAction
                title="Delete"
                onClick={() => deleteEstimate.mutate(item.id)}
                loading={deleteEstimate.isPending && deleteEstimate.variables === item.id}
                className="hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </IconAction>
            )}
          </div>
        );
      },
    },
  ], [busyAction, deleteEstimate, duplicateEstimate, handlePdfAction, navigate, sendEstimate]);

  if (view === 'create') {
    return (
      <EstimateBuilderForm
        mode="create"
        onComplete={() => setView('list')}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && editingEstimate) {
    return (
      <EstimateBuilderForm
        mode="edit"
        estimate={editingEstimate}
        onComplete={() => { setView('list'); setEditingId(null); }}
        onCancel={() => { setView('list'); setEditingId(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All estimates</h2>
          <p className="mt-1 text-sm text-gray-500">Create proposals, track margins, and convert wins to invoices or projects.</p>
        </div>
        <Button onClick={() => setView('create')} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New estimate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Drafts</p>
          <p className="mt-1 text-2xl font-bold text-gray-700">{stats.drafts}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Pipeline value</p>
          <p className="mt-1 text-xl font-bold text-blue-700">{formatCurrency(stats.pipelineValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Avg margin</p>
          <p className="mt-1 text-2xl font-bold text-violet-700">{stats.avgMargin.toFixed(1)}%</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, title, or customer…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No estimates yet</p>
            <p className="mt-1 text-xs text-gray-500">Create your first proposal to track cost, price, and margin.</p>
            <Button size="sm" className="mt-4" onClick={() => setView('create')}>
              <Plus className="h-4 w-4" />
              New estimate
            </Button>
          </div>
        ) : (
          <>
            <Table columns={columns} data={paginated.data} rowKey={(item) => item.id} />
            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}
