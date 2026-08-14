import { useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import RowActionsMenu, { type RowActionItem } from '../../../shared/components/tables/RowActionsMenu';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { TypeToConfirmModal } from '../../../shared/components/modals/TypeToConfirmModal';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { useToast } from '../../../app/contexts/useToast';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useEstimates,
  useSendEstimate,
  useDeleteEstimate,
  useDuplicateEstimate,
} from '../api/useEstimateQueries';
import type { Estimate } from '../api/estimateTypes';
import EstimateBuilderForm, { type EstimateBuilderHandle } from './EstimateBuilderForm';
import EstimateStatusBadge, { displayEstimateStatus } from '../ui/EstimateStatusBadge';
import { viewEstimatePdf, downloadEstimatePdf } from '../useEstimatePdf';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
const n = (v: unknown): number => Number(v) || 0;

import {
  FileSpreadsheet, Plus, Send, Download, Trash2, Search, Eye, Pencil, Copy,
  FileText, Target, TrendingUp, DollarSign,
} from 'lucide-react';

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
};

export default function EstimatesPage() {
  const navigate = useNavigate();
  const builderRef = useRef<EstimateBuilderHandle>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyAction, setBusyAction] = useState<{ id: number; type: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);

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
      .reduce((sum, e) => sum + n(e.total), 0);
    const approved = list.filter((e) => e.status === 'approved').length;
    const avgMargin = list.length
      ? list.reduce((sum, e) => sum + n(e.margin_percent), 0) / list.length
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

  const openCreate = useCallback(() => {
    setEditingId(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((id: number) => {
    setEditingId(id);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!builderRef.current) return;
    setIsSaving(true);
    try {
      await builderRef.current.submit();
      setDrawerOpen(false);
      setEditingId(null);
    } catch {
      /* toast handled in mutation */
    } finally {
      setIsSaving(false);
    }
  };

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
          n(item.margin_percent) >= 20 ? 'text-emerald-700' : 'text-amber-700',
        )}>
          {n(item.margin_percent).toFixed(1)}%
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
          {item.valid_until ? formatShiftDate(item.valid_until) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: Estimate) => {
        const isDraft = item.status === 'draft';
        const busy = (type: string) => busyAction?.id === item.id && busyAction.type === type;
        const actions: RowActionItem[] = [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4 text-gray-400" />,
            onClick: () => navigate(ROUTES.ESTIMATES.DETAIL(item.id)),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil className="h-4 w-4 text-gray-400" />,
            onClick: () => openEdit(item.id),
          },
          ...(isDraft
            ? [{
                key: 'send',
                label: 'Send',
                icon: <Send className="h-4 w-4 text-gray-400" />,
                onClick: () => sendEstimate.mutate(item.id),
                disabled: sendEstimate.isPending && sendEstimate.variables === item.id,
              }]
            : []),
          {
            key: 'download',
            label: 'Download PDF',
            icon: <Download className="h-4 w-4 text-gray-400" />,
            onClick: () => handlePdfAction(item.id, 'download'),
            disabled: busy('download'),
          },
          {
            key: 'duplicate',
            label: 'Duplicate',
            icon: <Copy className="h-4 w-4 text-gray-400" />,
            onClick: () => duplicateEstimate.mutate(item.id),
            disabled: duplicateEstimate.isPending && duplicateEstimate.variables === item.id,
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4 text-red-500" />,
            onClick: () => setDeleteTarget(item),
            dividerBefore: true,
            danger: true,
          },
        ];
        return (
          <div className="flex items-center justify-end">
            <RowActionsMenu items={actions} ariaLabel={`Estimate ${item.estimate_number} actions`} />
          </div>
        );
      },
    },
  ], [busyAction, duplicateEstimate, handlePdfAction, navigate, openEdit, sendEstimate]);

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const statCards = [
    { label: 'Total estimates', key: 'total' as const, value: String(stats.total), icon: FileSpreadsheet, color: 'blue' as const, badge: 'All' },
    { label: 'Drafts', key: 'drafts' as const, value: String(stats.drafts), icon: FileText, color: 'amber' as const, badge: 'Pending' },
    { label: 'Pipeline value', key: 'pipelineValue' as const, value: formatCurrency(stats.pipelineValue), icon: Target, color: 'indigo' as const, badge: 'Open' },
    { label: 'Approved', key: 'approved' as const, value: String(stats.approved), icon: TrendingUp, color: 'green' as const, badge: 'Won' },
    { label: 'Avg margin', key: 'avgMargin' as const, value: `${stats.avgMargin.toFixed(1)}%`, icon: DollarSign, color: 'purple' as const, badge: 'Margin' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All estimates</h2>
          <p className="mt-1 text-sm text-gray-500">Create proposals, track margins, and convert wins to invoices or projects.</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New estimate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          return (
            <div
              key={card.label}
              className={`group relative flex min-h-[120px] cursor-default flex-col justify-center rounded-xl border-2 bg-gradient-to-br from-white to-white p-5 transition-all duration-300 hover:-translate-y-0.5 ${s.border} ${s.shadow}`}
            >
              <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 overflow-hidden rounded-full blur-2xl ${s.glow}`} />
              <div className="relative mb-3 flex items-start justify-between gap-2">
                <div className={`shrink-0 rounded-xl p-3 transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{card.badge}</span>
              </div>
              <p className="relative mb-0.5 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">{card.value}</p>
              <p className="relative whitespace-normal break-words text-sm font-medium leading-snug text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, title, or customer..."
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

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No estimates yet</p>
            <p className="mt-1 text-xs text-gray-500">Create your first proposal to track cost, price, and margin.</p>
            <Button size="sm" className="mt-4" onClick={openCreate}>
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

      <SlideDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={editingEstimate ? `Edit ${editingEstimate.estimate_number}` : 'New estimate'}
        subtitle={editingEstimate ? editingEstimate.title : 'Create a new proposal with cost and margin tracking'}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        canSubmit
        fullContentWidth
      >
        <EstimateBuilderForm
          ref={builderRef}
          mode={editingEstimate ? 'edit' : 'create'}
          estimate={editingEstimate}
          onComplete={() => {
            setDrawerOpen(false);
            setEditingId(null);
          }}
          onCancel={handleDrawerClose}
          embedded
        />
      </SlideDrawer>

      <TypeToConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete estimate ${deleteTarget.estimate_number}` : 'Delete estimate'}
        subtitle={deleteTarget?.title}
        keyword={deleteTarget?.estimate_number ?? ''}
        keywordLabel="Estimate number"
        message="Deleting this estimate permanently removes it and its line items. This cannot be undone."
        isDeleting={deleteEstimate.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteEstimate.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}