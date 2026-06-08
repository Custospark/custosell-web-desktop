import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquareHeart, RefreshCw, Search } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { Badge } from '../../shared/components/badges/Badge';
import type { GuideFeedbackStatus } from '../guide/api/GuideTypes';
import {
  usePlatformGuideFeedbackDetail,
  usePlatformGuideFeedbackList,
  useUpdatePlatformGuideFeedback,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';
import { inputClass, selectClass, textareaClass } from '../../shared/utils/inputStyles';

const STATUSES: GuideFeedbackStatus[] = ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export default function PlatformGuideFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
  const detail = detailQuery.data;

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
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
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
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => selectRow(row.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      selectedId === row.id && 'bg-blue-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{row.subject}</p>
                      <Badge variant="neutral">{row.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.user_display}
                      {row.business_name ? ` · ${row.business_name}` : ''}
                    </p>
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
                <h2 className="text-lg font-semibold text-gray-900">{detail.subject}</h2>
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
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
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
              <Button onClick={() => void onSave()} disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
