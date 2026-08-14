import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards, usePipelineLeads, usePipelineSources } from '../api/usePipelineQueries';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import LeadDetailModal from '../ui/LeadDetailModal';
import CreateLeadModal from '../ui/CreateLeadModal';
import { PipelineStatusBadge } from '../ui/pipelineStatusBadge';
import { pipelineSelectClass } from '../ui/pipelineFormFields';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import {
  Filter, Plus, Users, UserRound, X,
} from 'lucide-react';

const selectClass = pipelineSelectClass;

export default function AllLeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [boardId, setBoardId] = useState(searchParams.get('board_id') ?? '');
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assigned_to') ?? '');
  const [sourceId, setSourceId] = useState(searchParams.get('source_id') ?? '');
  const [cardType, setCardType] = useState(searchParams.get('card_type') ?? '');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: boards } = usePipelineBoards({ salesOnly: true });
  const { data: sources } = usePipelineSources();
  const { data: staff } = useStaff();

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search.trim()) f.search = search.trim();
    if (status) f.status = status;
    if (boardId) f.board_id = boardId;
    if (assignedTo) f.assigned_to = assignedTo;
    if (sourceId) f.source_id = sourceId;
    if (cardType) f.card_type = cardType;
    return f;
  }, [search, status, boardId, assignedTo, sourceId, cardType]);

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => next.set(k, v));
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  const { data: leads, isLoading, error, refetch } = usePipelineLeads(filters);

  const sorted = useMemo(
    () => [...(leads ?? [])].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()),
    [leads],
  );

  const paginated = usePagination(sorted, 15);

  const stats = useMemo(() => {
    const list = leads ?? [];
    return {
      total: list.length,
      open: list.filter((l) => l.status === 'open').length,
      value: list.reduce((sum, l) => sum + (l.status === 'open' ? (l.estimated_value ?? 0) : 0), 0),
      won: list.filter((l) => l.status === 'won').length,
    };
  }, [leads]);

  const hasActiveFilters = Boolean(search || status || boardId || assignedTo || sourceId || cardType);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setBoardId('');
    setAssignedTo('');
    setSourceId('');
    setCardType('');
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Failed to load leads"
        description={error.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All leads & cards</h2>
          <p className="mt-1 text-sm text-gray-500">Search, filter, and manage every item across your boards.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add lead / card
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Matching results', value: stats.total, color: 'text-blue-700' },
          { label: 'Open in view', value: stats.open, color: 'text-emerald-700' },
          { label: 'Open value', value: formatCurrency(stats.value), color: 'text-gray-900' },
          { label: 'Won in view', value: stats.won, color: 'text-amber-700' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold', item.color)}>{item.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 space-y-3">
          <SearchInput
            placeholder="Search by title, contact, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-gray-400" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
            </select>
            <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className={selectClass}>
              <option value="">All boards</option>
              {(boards ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={selectClass}>
              <option value="">Any assignee</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              {(staff ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={selectClass}>
              <option value="">Any source</option>
              {(sources ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={cardType} onChange={(e) => setCardType(e.target.value)} className={selectClass}>
              <option value="">All types</option>
              <option value="lead">Sales leads</option>
              <option value="card">Project cards</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={hasActiveFilters ? 'No leads match your filters' : 'No leads yet'}
            description={hasActiveFilters
              ? 'Try adjusting filters or search terms.'
              : 'Create your first lead or add cards from a board.'}
            actionLabel={hasActiveFilters ? 'Clear filters' : 'Add lead / card'}
            onAction={hasActiveFilters ? clearFilters : () => setCreateOpen(true)}
          />
        ) : (
          <>
            <Table<PipelineLead>
              rowKey={(l) => l.id}
              columns={[
                {
                  key: 'title',
                  header: 'Lead / card',
                  render: (lead) => (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {lead.title}
                      </button>
                      {lead.contact_name && (
                        <p className="text-xs text-gray-500">{lead.contact_name}</p>
                      )}
                      <span className="mt-0.5 inline-block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        {lead.card_type === 'card' ? 'Project' : 'Sales lead'}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'board',
                  header: 'Board',
                  render: (lead) => lead.board ? (
                    <Link to={ROUTES.PIPELINE.BOARD(lead.board.code ?? lead.board.id)} className="text-gray-700 hover:text-blue-700">
                      {lead.board.name}
                    </Link>
                  ) : '-',
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  render: (lead) => (
                    <span className="inline-flex items-center gap-1.5">
                      {lead.stage && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: lead.stage.color ?? '#94a3b8' }}
                        />
                      )}
                      {lead.stage?.name ?? '-'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (lead) => <PipelineStatusBadge status={lead.status} />,
                },
                {
                  key: 'source',
                  header: 'Source',
                  render: (lead) => lead.source?.name ?? <span className="text-gray-400">-</span>,
                },
                {
                  key: 'assignee',
                  header: 'Assignee',
                  render: (lead) => (
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <UserRound className="h-3.5 w-3.5 text-gray-400" />
                      {lead.assignee?.name ?? 'Unassigned'}
                    </span>
                  ),
                },
                {
                  key: 'value',
                  header: 'Value',
                  render: (lead) => (
                    lead.estimated_value != null
                      ? formatCurrency(lead.estimated_value, lead.currency)
                      : <span className="text-gray-400">-</span>
                  ),
                },
                {
                  key: 'updated',
                  header: 'Updated',
                  render: (lead) => (
                    <span className="text-gray-500">
                      {lead.updated_at ? formatShiftDate(lead.updated_at) : '-'}
                    </span>
                  ),
                },
              ]}
              data={paginated.data}
            />
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

      {selectedLeadId != null && (
        <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}

      {createOpen && (
        <CreateLeadModal open onClose={() => setCreateOpen(false)} />
      )}
    </>
  );
}
