import { useCallback, useMemo, useState } from 'react';
import { CheckSquare, ChevronDown, ChevronUp, Loader2, MessageSquareHeart, Send, Square, Trash2, WifiOff } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import type { GuideFeedbackWithSyncMeta } from '../../app/store/offline/localGuideFeedbackStore';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { GuideFeedbackStatusBadge } from './components/GuideFeedbackStatusBadge';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import {
  feedbackSelectionKey,
  useBulkDeleteMyGuideFeedback,
  useCreateGuideFeedback,
  useDeleteMyGuideFeedback,
  useMyGuideFeedback,
} from './api/GuideQueries';
import type { GuideFeedbackCategory } from './api/GuideTypes';
import { cn } from '../../shared/utils/cn';
import { inputClass, textareaClass } from '../../shared/utils/inputStyles';

function formatWhen(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function messagePreview(text: string, maxLength = 100): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export default function GuideFeedbackPage() {
  const { confirm } = useConfirm();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const [category, setCategory] = useState<GuideFeedbackCategory>('feedback');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: mine = [], isLoading } = useMyGuideFeedback();
  const createMut = useCreateGuideFeedback();
  const deleteMut = useDeleteMyGuideFeedback();
  const bulkDeleteMut = useBulkDeleteMyGuideFeedback();

  const allKeys = useMemo(() => mine.map(feedbackSelectionKey), [mine]);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedKeys.has(key));
  const selectedItems = useMemo(
    () => mine.filter((item) => selectedKeys.has(feedbackSelectionKey(item))),
    [mine, selectedKeys],
  );
  const deletePending = deleteMut.isPending || bulkDeleteMut.isPending;

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(allKeys));
  }, [allKeys, allSelected]);

  const toggleOne = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDeleteOne = useCallback(
    async (item: GuideFeedbackWithSyncMeta) => {
      const ok = await confirm({
        title: 'Delete submission',
        message: `Remove "${item.subject}"? This cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteMut.mutateAsync(item);
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(feedbackSelectionKey(item));
          return next;
        });
        imperativeToast.show('success', 'Submission deleted.');
      } catch {
        imperativeToast.show('error', 'Could not delete submission.');
      }
    },
    [confirm, deleteMut],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;
    const ok = await confirm({
      title: 'Delete submissions',
      message: `Delete ${selectedItems.length} submission(s)? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await bulkDeleteMut.mutateAsync(selectedItems);
      setSelectedKeys(new Set());
      imperativeToast.show('success', 'Submissions deleted.');
    } catch {
      imperativeToast.show('error', 'Could not delete submissions.');
    }
  }, [bulkDeleteMut, confirm, selectedItems]);

  const onSubmit = useCallback(async () => {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      imperativeToast.show('warning', 'Please add a subject and details before sending.');
      return;
    }
    try {
      const saved = await createMut.mutateAsync({ category, subject: s, body: b });
      if (saved._pendingSync) {
        imperativeToast.show('success', 'Message saved — it will send when you are back online.');
      } else {
        imperativeToast.show('success', 'Thanks — your message was sent to the Custosell team.');
      }
      setSubject('');
      setBody('');
      setComposeOpen(false);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      imperativeToast.show('error', msg ?? 'Could not send your submission. Please try again.');
    }
  }, [body, category, createMut, subject]);

  const hasVisibleSubmissions = mine.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <MessageSquareHeart className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Guide</p>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Share feedback or request a feature. The Custosell team reads every submission and may reply here.
            {isOffline && ' You can still compose messages offline — they will send automatically when you reconnect.'}
          </p>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            You are offline. New messages are saved on this device and queued to send when connectivity returns.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Send a message</h2>
            <p className="mt-1 text-sm text-gray-600">Tell us what is working well or what we should improve.</p>
          </div>
          {!composeOpen && (
            <Button onClick={() => setComposeOpen(true)}>
              <Send className="h-4 w-4" aria-hidden />
              Send a message
            </Button>
          )}
        </div>

        {composeOpen && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  { value: 'feedback' as const, label: 'General feedback' },
                  { value: 'feature_request' as const, label: 'Feature request' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    category === opt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">Subject</span>
                <input
                  className={inputClass}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Short summary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">Details</span>
                <textarea
                  rows={6}
                  className={textareaClass}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={20000}
                  placeholder="Describe your feedback or request in as much detail as you like."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void onSubmit()} disabled={createMut.isPending}>
                  {createMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {isOffline ? 'Saving…' : 'Sending…'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden />
                      {isOffline ? 'Save message' : 'Send message'}
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setComposeOpen(false)} disabled={createMut.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Your submissions</h2>
          {hasVisibleSubmissions && (
            <div className="flex flex-wrap items-center gap-2">
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
                {allSelected ? 'Deselect all' : `Select all (${mine.length})`}
              </button>
              {selectedKeys.size > 0 && (
                <>
                  <span className="text-gray-300" aria-hidden>
                    |
                  </span>
                  <Button variant="danger" size="sm" onClick={() => void handleBulkDelete()} disabled={deletePending}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Delete ({selectedKeys.size})
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        )}
        {!isLoading && !hasVisibleSubmissions && (
          <p className="text-sm text-gray-600">
            {isOffline
              ? 'You have not sent any feedback yet. Saved offline messages will appear here.'
              : 'You have not sent any feedback yet.'}
          </p>
        )}
        {mine.map((item) => {
          const key = feedbackSelectionKey(item);
          return (
            <FeedbackMineCard
              key={key}
              item={item}
              selected={selectedKeys.has(key)}
              expanded={expandedKey === key}
              onToggleExpand={() => setExpandedKey((prev) => (prev === key ? null : key))}
              onToggle={() => toggleOne(key)}
              onDelete={() => void handleDeleteOne(item)}
              deleteDisabled={deletePending}
            />
          );
        })}
      </div>
    </div>
  );
}

function FeedbackMineCard({
  item,
  selected,
  expanded,
  onToggleExpand,
  onToggle,
  onDelete,
  deleteDisabled,
}: {
  item: GuideFeedbackWithSyncMeta;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        className="w-full cursor-pointer p-4 text-left transition-colors hover:bg-gray-50/80"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-700"
              aria-label={selected ? 'Deselect submission' : 'Select submission'}
            >
              {selected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" aria-hidden />
              ) : (
                <Square className="h-4 w-4" aria-hidden />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{item.subject}</h3>
                {item._syncFailed ? (
                  <span title={item._lastError || 'Sync failed'}>
                    <Badge variant="danger">Sync failed</Badge>
                  </span>
                ) : item._pendingSync ? (
                  <Badge variant="warning">Pending sync</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {item.category === 'feature_request' ? 'Feature request' : 'Feedback'} · {formatWhen(item.created_at)}
              </p>
              {!expanded && (
                <p className="mt-2 text-sm text-gray-500 truncate">{messagePreview(item.body)}</p>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400">
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    Open
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GuideFeedbackStatusBadge status={item.status} />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={deleteDisabled}
              title="Delete submission"
            >
              <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{item.body}</p>
          {item.staff_reply ? (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reply from Custosell team</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{item.staff_reply}</p>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
