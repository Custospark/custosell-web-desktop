import { useCallback, useState } from 'react';
import { Loader2, MessageSquareHeart, Send } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { useCreateGuideFeedback, useMyGuideFeedback } from './api/GuideQueries';
import type { GuideFeedbackCategory, GuideFeedbackMineDto } from './api/GuideTypes';
import { cn } from '../../shared/utils/cn';
import { inputClass, textareaClass } from '../../shared/utils/inputStyles';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function formatWhen(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GuideFeedbackPage() {
  const [category, setCategory] = useState<GuideFeedbackCategory>('feedback');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: mine = [], isLoading } = useMyGuideFeedback();
  const createMut = useCreateGuideFeedback();

  const onSubmit = useCallback(async () => {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      imperativeToast.show('warning', 'Please add a subject and details before sending.');
      return;
    }
    try {
      await createMut.mutateAsync({ category, subject: s, body: b });
      imperativeToast.show('success', 'Thanks — your message was sent to the Custosell team.');
      setSubject('');
      setBody('');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      imperativeToast.show('error', msg ?? 'Could not send your submission. Please try again.');
    }
  }, [body, category, createMut, subject]);

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
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Send a message</h2>
        <p className="mt-1 text-sm text-gray-600">Tell us what is working well or what we should improve.</p>

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
          <Button onClick={() => void onSubmit()} disabled={createMut.isPending}>
            {createMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden />
                Send message
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Your submissions</h2>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        )}
        {!isLoading && mine.length === 0 && (
          <p className="text-sm text-gray-600">You have not sent any feedback yet.</p>
        )}
        {mine.map((item) => (
          <FeedbackMineCard key={item.uuid} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedbackMineCard({ item }: { item: GuideFeedbackMineDto }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{item.subject}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {item.category === 'feature_request' ? 'Feature request' : 'Feedback'} · {formatWhen(item.created_at)}
          </p>
        </div>
        <Badge variant="neutral">{STATUS_LABELS[item.status] ?? item.status}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.body}</p>
      {item.staff_reply ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reply from Custosell team</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{item.staff_reply}</p>
        </div>
      ) : null}
    </article>
  );
}
