import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Loader2, MessageSquareHeart, RefreshCw, Search, Square, Trash2, Tag } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import type { GuideFeedbackStatus } from '../guide/api/GuideTypes';
import {
  GUIDE_FEEDBACK_STATUS_LABELS,
  GuideFeedbackStatusBadge,
} from '../guide/components/GuideFeedbackStatusBadge';
import {
  useBulkDeletePlatformGuideFeedback,
  useBulkUpdatePlatformGuideFeedback,
  useDeletePlatformGuideFeedback,
  usePlatformGuideFeedbackDetail,
  usePlatformGuideFeedbackList,
  useUpdatePlatformGuideFeedback,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';
import { inputClass, selectClass, textareaClass } from '../../shared/utils/inputStyles';
import { PlatformBulkActionBar } from './components/PlatformBulkActionBar';

const STATUSES: GuideFeedbackStatus[] = ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export default function PlatformGuideFeedbackPage() {
  const { confirm } = useConfirm();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<GuideFeedbackStatus>('acknowledged');

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      q: appliedQ.trim() || undefined,
    }),
    [appliedQ, categoryFilter, statusFilter],
  );

  const { data: rows = [], isLoading, isError, refetch, isFetching } = usePlatformGuideFeedbackList(filters);
  const detailQuery = usePlatformGuideFeedbackDetail(selectedId);
  const updateMut = useUpdatePlatformGuideFeedback();
  const deleteMut = useDeletePlatformGuideFeedback();
  const bulkDeleteMut = useBulkDeletePlatformGuideFeedback();
  const bulkUpdateMut = useBulkUpdatePlatformGuideFeedback();
  const detail = detailQuery.data;

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const deletePending = deleteMut.isPending || bulkDeleteMut.isPending;
  const bulkPending = deletePending || bulkUpdateMut.isPending;

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rowIds));
  }, [allSelected, rowIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteIds = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      const ok = await confirm({
        title: ids.length === 1 ? 'Delete submission' : 'Delete submissions',
        message:
          ids.length === 1
            ? 'Remove this feedback submission? This cannot be undone.'
            : `Delete ${ids.length} submission(s)? This cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        if (ids.length === 1) await deleteMut.mutateAsync(ids[0]);
        else await bulkDeleteMut.mutateAsync(ids);
        if (selectedId != null && ids.includes(selectedId)) setSelectedId(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        imperativeToast.show('success', ids.length === 1 ? 'Submission deleted.' : 'Submissions deleted.');
      } catch {
        imperativeToast.show('error', 'Could not delete submission(s).');
      }
    },
    [bulkDeleteMut, confirm, deleteMut, selectedId],
  );

  const handleBulkStatusUpdate = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await bulkUpdateMut.mutateAsync({ ids, status: bulkStatus });
      imperativeToast.show('success', `Updated status for ${ids.length} submission(s).`);
    } catch {
      imperativeToast.show('error', 'Could not update status.');
    }
  }, [bulkStatus, bulkUpdateMut, selectedIds]);

  const [statusDraft, setStatusDraft] = useState<GuideFeedbackStatus>('submitted');
  const [staffReply, setStaffReply] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const selectRow = useCallback(
    (id: number) => {
      setSelectedId(id);
    },
    [],
  );

  const loadDetailIntoForm = useCallback(() => {
    if (!detail) return;
    setStatusDraft(detail.status);
    setStaffReply(detail.staff_reply ?? '');
    setInternalNotes(detail.admin_internal_notes ?? '');
  }, [detail]);

  useEffect(() => {
    loadDetailIntoForm();
  }, [loadDetailIntoForm]);

  const onSave = useCallback(async () => {
    if (selectedId == null) return;
    try {
      await updateMut.mutateAsync({
        id: selectedId,
        payload: {
          status: statusDraft,
          staff_reply: staffReply.trim() || null,
          admin_internal_notes: internalNotes.trim() || null,
        },
      });
      imperativeToast.show('success', 'Saved.');
      void detailQuery.refetch();
    } catch {
      imperativeToast.show('error', 'Update failed.');
    }
  }, [detailQuery, internalNotes, selectedId, staffReply, statusDraft, updateMut]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <MessageSquareHeart className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Guide Settings</p>
            <h1 className="text-xl font-semibold text-gray-900">Feedback</h1>
            <p className="text-sm text-gray-600">Review user submissions and reply where appropriate.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[140px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-600">Status</span>
          <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{GUIDE_FEEDBACK_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[140px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-600">Category</span>
          <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All</option>
            <option value="feedback">Feedback</option>
            <option value="feature_request">Feature request</option>
          </select>
        </label>
        <label className="block min-w-[180px] flex-[2] text-sm">
          <span className="mb-1 block font-medium text-gray-600">Search</span>
          <div className="flex gap-2">
            <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Subject or body…" />
            <Button variant="secondary" onClick={() => setAppliedQ(q)}>
              <Search className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white">
          {!isLoading && !isError && rows.length > 0 && (
            <div className="border-b border-gray-100 px-4 py-2">
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" aria-hidden />
                ) : (
                  <Square className="h-4 w-4" aria-hidden />
                )}
                {allSelected ? 'Deselect all' : `Select all (${rows.length})`}
              </button>
            </div>
          )}
          <PlatformBulkActionBar
            count={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            className="mx-4 my-3 border-indigo-200"
          >
            <label className="flex items-center gap-2 text-sm text-indigo-950">
              <span className="sr-only">Bulk status</span>
              <select
                className={cn(selectClass, 'h-8 min-w-[140px] border-indigo-200 bg-white py-1 text-sm')}
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as GuideFeedbackStatus)}
                disabled={bulkPending}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {GUIDE_FEEDBACK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" size="sm" onClick={() => void handleBulkStatusUpdate()} disabled={bulkPending}>
              <Tag className="mr-1 h-3.5 w-3.5" aria-hidden />
              Update status
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDeleteIds(Array.from(selectedIds))}
              disabled={bulkPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
          </PlatformBulkActionBar>
          {isLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          )}
          {isError && <p className="p-4 text-sm text-red-600">Could not load feedback.</p>}
          {!isLoading && !isError && (
            <ul className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => toggleOne(row.id)}
                    className="flex shrink-0 items-center px-3 text-gray-400 hover:text-gray-700"
                    aria-label={selectedIds.has(row.id) ? 'Deselect submission' : 'Select submission'}
                  >
                    {selectedIds.has(row.id) ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" aria-hidden />
                    ) : (
                      <Square className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRow(row.id)}
                    className={cn(
                      'min-w-0 flex-1 px-2 py-3 text-left transition-colors hover:bg-gray-50',
                      selectedId === row.id && 'bg-blue-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{row.subject}</p>
                      <GuideFeedbackStatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.user_display}
                      {row.business_name ? ` · ${row.business_name}` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteIds([row.id])}
                    disabled={deletePending}
                    className="flex shrink-0 items-center px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Delete submission"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-gray-500">No submissions match these filters.</li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {selectedId == null && (
            <p className="text-sm text-gray-500">Select a submission to view details and reply.</p>
          )}
          {selectedId != null && detailQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading detail…
            </div>
          )}
          {detail && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{detail.subject}</h2>
                  <GuideFeedbackStatusBadge status={detail.status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {detail.user_display} ({detail.user_email}) · {detail.category.replace(/_/g, ' ')}
                  {detail.business_name ? ` · ${detail.business_name}` : ''}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{detail.body}</p>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-600">Status</span>
                <select className={selectClass} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as GuideFeedbackStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{GUIDE_FEEDBACK_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-600">Reply to user (visible on their Guide page)</span>
                <textarea rows={4} className={textareaClass} value={staffReply} onChange={(e) => setStaffReply(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-600">Internal notes</span>
                <textarea rows={3} className={textareaClass} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void onSave()} disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void handleDeleteIds([selectedId!])}
                  disabled={deletePending}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
