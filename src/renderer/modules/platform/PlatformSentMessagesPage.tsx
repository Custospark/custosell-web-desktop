import { useCallback, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { BellRing, CheckSquare, Loader2, RefreshCw, Search, Square, Trash2 } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import {
  useBulkDeletePlatformNotificationDispatches,
  useDeletePlatformNotificationDispatch,
  usePlatformNotificationDispatchDetail,
  usePlatformNotificationDispatches,
} from './api/PlatformDispatchQueries';
import type { PlatformNotificationDispatchListItem } from './api/PlatformTypes';
import {
  DispatchAudienceBadge,
  DispatchIntentionBadge,
  DispatchTypeBadge,
} from './components/PlatformDispatchBadges';
import { PlatformBulkActionBar } from './components/PlatformBulkActionBar';
import { cn } from '../../shared/utils/cn';
import { inputClass, selectClass } from '../../shared/utils/inputStyles';

const DISPATCH_TYPE_LABELS: Record<string, string> = {
  message: 'Custom message',
  status_change: 'Status change',
};

const TARGET_KIND_LABELS: Record<string, string> = {
  user: 'Users',
  business: 'Businesses',
};

const INTENTION_LABELS: Record<string, string> = {
  announcement: 'Announcement',
  warning_notice: 'Warning',
  payment_reminder: 'Payment reminder',
  policy_update: 'Policy update',
  reactivation_nudge: 'Re-engagement',
  account_notice: 'Account notice',
  custom: 'Custom',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  in_app: 'In-app',
  both: 'Email + in-app',
};

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dispatchTitle(row: PlatformNotificationDispatchListItem): string {
  if (row.subject?.trim()) return row.subject;
  if (row.dispatch_type === 'status_change' && row.status_to) {
    return `Status → ${row.status_to.replace(/_/g, ' ')}`;
  }
  if (row.intention) {
    return INTENTION_LABELS[row.intention] ?? row.intention.replace(/_/g, ' ');
  }
  return DISPATCH_TYPE_LABELS[row.dispatch_type] ?? 'Platform message';
}

function dispatchMutationError(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string }>;
  return axiosErr.response?.data?.message ?? (err instanceof Error ? err.message : fallback);
}

export default function PlatformSentMessagesPage() {
  const { confirm } = useConfirm();
  const [targetKind, setTargetKind] = useState('');
  const [dispatchType, setDispatchType] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const params = useMemo(
    () => ({
      per_page: '30',
      ...(targetKind ? { target_kind: targetKind } : {}),
      ...(dispatchType ? { dispatch_type: dispatchType } : {}),
      ...(appliedQ.trim() ? { q: appliedQ.trim() } : {}),
    }),
    [appliedQ, dispatchType, targetKind],
  );

  const { data, isLoading, isError, refetch, isFetching } = usePlatformNotificationDispatches(params);
  const detailQuery = usePlatformNotificationDispatchDetail(selectedId);
  const deleteMut = useDeletePlatformNotificationDispatch();
  const bulkDeleteMut = useBulkDeletePlatformNotificationDispatches();
  const rows = data?.data ?? [];
  const detail = detailQuery.data;

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const deletePending = deleteMut.isPending || bulkDeleteMut.isPending;

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
        title: ids.length === 1 ? 'Remove from log' : 'Remove from log',
        message:
          ids.length === 1
            ? 'Remove this entry from the platform sent-messages log? Recipients will still see in-app notifications and any emails already sent. This cannot be undone.'
            : `Remove ${ids.length} entries from the sent-messages log? Recipients will still see in-app notifications and any emails already sent. This cannot be undone.`,
        confirmText: 'Remove from log',
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
        imperativeToast.show(
          'success',
          ids.length === 1 ? 'Sent message removed from log.' : 'Sent messages removed from log.',
        );
      } catch (err) {
        imperativeToast.show('error', dispatchMutationError(err, 'Could not remove sent message(s) from log.'));
      }
    },
    [bulkDeleteMut, confirm, deleteMut, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <BellRing className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Platform</p>
            <h1 className="text-xl font-semibold text-gray-900">Sent messages</h1>
            <p className="text-sm text-gray-600">
              Review what was sent to users and businesses, when, and why.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Removing entries here clears the admin log only — it does not recall emails or remove notifications from recipients&apos; inboxes.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[140px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-600">Audience</span>
          <select className={selectClass} value={targetKind} onChange={(e) => setTargetKind(e.target.value)}>
            <option value="">All</option>
            <option value="user">Users</option>
            <option value="business">Businesses</option>
          </select>
        </label>
        <label className="block min-w-[140px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-gray-600">Type</span>
          <select className={selectClass} value={dispatchType} onChange={(e) => setDispatchType(e.target.value)}>
            <option value="">All</option>
            <option value="message">Custom message</option>
            <option value="status_change">Status change</option>
          </select>
        </label>
        <label className="block min-w-[180px] flex-[2] text-sm">
          <span className="mb-1 block font-medium text-gray-600">Search</span>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Message, subject, or recipient…"
            />
            <Button variant="secondary" onClick={() => setAppliedQ(q)}>
              <Search className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDeleteIds(Array.from(selectedIds))}
              disabled={deletePending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              Remove from log
            </Button>
          </PlatformBulkActionBar>

          {isLoading && (
            <div className="p-4">
              <LoadingSkeleton variant="table" />
            </div>
          )}
          {isError && <p className="p-4 text-sm text-red-600">Could not load sent messages.</p>}
          {!isLoading && !isError && rows.length === 0 && (
            <EmptyState
              icon={<BellRing className="h-12 w-12" />}
              title="No sent messages yet"
              description="When you notify users or businesses from Platform, the history will appear here."
            />
          )}
          {!isLoading && !isError && rows.length > 0 && (
            <ul className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => toggleOne(row.id)}
                    className="flex shrink-0 items-center px-3 text-gray-400 hover:text-gray-700"
                    aria-label={selectedIds.has(row.id) ? 'Deselect message' : 'Select message'}
                  >
                    {selectedIds.has(row.id) ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" aria-hidden />
                    ) : (
                      <Square className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cn(
                      'min-w-0 flex-1 px-2 py-4 text-left transition-colors hover:bg-gray-50',
                      selectedId === row.id && 'bg-blue-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{dispatchTitle(row)}</p>
                        <p className="mt-1 text-sm text-gray-600">{row.recipient_summary}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{row.message_preview}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{formatWhen(row.sent_at)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <DispatchAudienceBadge targetKind={row.target_kind} />
                      <DispatchTypeBadge dispatchType={row.dispatch_type} />
                      {row.intention ? <DispatchIntentionBadge intention={row.intention} /> : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteIds([row.id])}
                    disabled={deletePending}
                    className="flex shrink-0 items-center px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Remove from log"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          {selectedId == null && (
            <p className="text-sm text-gray-500">Select a sent message to view full details and recipients.</p>
          )}
          {selectedId != null && detailQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading details…
            </div>
          )}
          {detail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{dispatchTitle(detail)}</h2>
                <p className="mt-1 text-xs text-gray-500">Sent {formatWhen(detail.sent_at)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <DispatchAudienceBadge targetKind={detail.target_kind} />
                <DispatchTypeBadge dispatchType={detail.dispatch_type} />
                {detail.intention ? <DispatchIntentionBadge intention={detail.intention} /> : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField label="Sent by" value={detail.actor?.name ?? 'System'} />
                <DetailField label="Channel" value={CHANNEL_LABELS[detail.channel] ?? detail.channel} />
                <DetailField label="Audience" value={TARGET_KIND_LABELS[detail.target_kind] ?? detail.target_kind} />
                <DetailField label="Type" value={DISPATCH_TYPE_LABELS[detail.dispatch_type] ?? detail.dispatch_type} />
                {detail.intention ? (
                  <DetailField
                    label="Intention"
                    value={INTENTION_LABELS[detail.intention] ?? detail.intention}
                  />
                ) : null}
                {detail.status_from || detail.status_to ? (
                  <DetailField
                    label="Status change"
                    value={`${detail.status_from ?? '—'} → ${detail.status_to ?? '—'}`}
                  />
                ) : null}
                {detail.mark_as_notified ? <DetailField label="Marked notified" value="Yes" /> : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{detail.message}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recipients ({detail.recipient_count})
                </p>
                <ul className="mt-2 space-y-2">
                  {detail.recipients.map((recipient) => (
                    <li
                      key={`${recipient.type}-${recipient.id}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-gray-900">{recipient.name ?? `ID ${recipient.id}`}</p>
                      <p className="text-xs text-gray-500">
                        {recipient.email ?? recipient.owner_email ?? 'No email on file'}
                        {recipient.business_name ? ` · ${recipient.business_name}` : ''}
                        {recipient.in_app_recipient_count != null
                          ? ` · ${recipient.in_app_recipient_count} in-app recipient(s)`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}
