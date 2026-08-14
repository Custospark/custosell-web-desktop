import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import type { PipelinePoll } from '../api/pipelineTypes';
import { minDatetimeLocalValue } from '../api/pollDateTimeUtils';
import { BarChart3, Plus } from 'lucide-react';
import PollCard from './PollCard';
import { ResultsVisibilityPicker } from './pollVisibilityPicker';

export type ResultsVisibility = 'team' | 'creator_only';

export type PollEditDraft = {
  question: string;
  options: { id?: number; label: string }[];
  closesAt: string;
  resultsVisibility: ResultsVisibility;
};

export interface BoardPollsTabProps {
  currentUserId?: number | null;
  canManage: boolean;
  canContribute: boolean;
  pendingCount: number;
  loading: boolean;
  polls: PipelinePoll[];
  question: string;
  onQuestionChange: (value: string) => void;
  options: string[];
  onOptionsChange: (value: string[]) => void;
  closesAt: string;
  onClosesAtChange: (value: string) => void;
  resultsVisibility: ResultsVisibility;
  onResultsVisibilityChange: (value: ResultsVisibility) => void;
  creating: boolean;
  onCreate: () => void;
  onStartEdit: (poll: PipelinePoll) => void;
  onCancelEdit: () => void;
  editingPollId: number | null;
  editDraft: PollEditDraft | null;
  onDraftChange: (draft: PollEditDraft) => void;
  savingEdit: boolean;
  onSaveEdit: () => void;
  onVote: (pollId: number, optionId: number) => void;
  onRemoveVote: (pollId: number) => void;
  onDeletePoll: (pollId: number) => void;
  voting: boolean;
  removingVote: boolean;
}

export default function BoardPollsTab({
  currentUserId,
  canManage,
  canContribute,
  pendingCount,
  loading,
  polls,
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  closesAt,
  onClosesAtChange,
  resultsVisibility,
  onResultsVisibilityChange,
  creating,
  onCreate,
  onStartEdit,
  onCancelEdit,
  editingPollId,
  editDraft,
  onDraftChange,
  savingEdit,
  onSaveEdit,
  onVote,
  onRemoveVote,
  onDeletePoll,
  voting,
  removingVote,
}: BoardPollsTabProps) {
  const sorted = [...polls].sort((a, b) => {
    const pendingDiff = Number(a.user_has_voted) - Number(b.user_has_voted);
    if (pendingDiff !== 0) return pendingDiff;
    const votesA = a.total_votes ?? 0;
    const votesB = b.total_votes ?? 0;
    return votesB - votesA;
  });

  return (
    <div className="space-y-4">
      {canContribute && pendingCount > 0 && !loading && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <span className="font-semibold">Tap any option to vote instantly.</span>
          {' '}No extra submit step needed.
        </div>
      )}

      {canManage && (
        <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <BarChart3 className="h-4 w-4" />
            Create a poll
          </p>
          <input
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="Poll question"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {options.map((opt, idx) => (
            <input
              key={idx}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[idx] = e.target.value;
                onOptionsChange(next);
              }}
              placeholder={`Option ${idx + 1}`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          ))}
          {options.length < 8 && (
            <button
              type="button"
              onClick={() => onOptionsChange([...options, ''])}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          )}
          <div className="rounded-lg border border-violet-200 bg-white/80 p-3">
            <p className="text-xs font-semibold text-violet-900">Voting deadline</p>
            <p className="mt-1 text-xs text-violet-700">Optional - voting closes automatically after this date and time.</p>
            <input
              type="datetime-local"
              value={closesAt}
              min={minDatetimeLocalValue()}
              onChange={(e) => onClosesAtChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {closesAt && (
              <button
                type="button"
                onClick={() => onClosesAtChange('')}
                className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear deadline
              </button>
            )}
          </div>
          <ResultsVisibilityPicker value={resultsVisibility} onChange={onResultsVisibilityChange} />
          <Button
            type="button"
            size="sm"
            className="mt-4"
            loading={creating}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
            onClick={onCreate}
          >
            Launch poll & notify team
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <CustosellLoader />
        </div>
      ) : (
        <ul className="max-h-[min(50vh,400px)] space-y-4 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
              No polls on this board yet.
            </li>
          ) : (
            sorted.map((poll) =>
              editingPollId === poll.id && editDraft ? (
                <PollEditForm
                  key={poll.id}
                  poll={poll}
                  draft={editDraft}
                  onDraftChange={onDraftChange}
                  saving={savingEdit}
                  onSave={onSaveEdit}
                  onCancel={onCancelEdit}
                />
              ) : (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUserId={currentUserId}
                  canContribute={canContribute}
                  onStartEdit={onStartEdit}
                  onVote={onVote}
                  onRemoveVote={onRemoveVote}
                  onDelete={onDeletePoll}
                  voting={voting}
                  removingVote={removingVote}
                />
              ),
            )
          )}
        </ul>
      )}
    </div>
  );
}

function PollEditForm({
  poll,
  draft,
  onDraftChange,
  saving,
  onSave,
  onCancel,
}: {
  poll: PipelinePoll;
  draft: PollEditDraft;
  onDraftChange: (draft: PollEditDraft) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <li key={poll.id} className="rounded-xl border border-violet-300 bg-violet-50/30 p-4 shadow-sm ring-1 ring-violet-200">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-900">
        <BarChart3 className="h-4 w-4" />
        Edit poll
      </p>
      <div className="space-y-3">
        <input
          value={draft.question}
          onChange={(e) => onDraftChange({ ...draft, question: e.target.value })}
          placeholder="Poll question"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        />
        {draft.options.map((opt, idx) => (
          <input
            key={opt.id ?? `new-${idx}`}
            value={opt.label}
            onChange={(e) => {
              const next = [...draft.options];
              next[idx] = { ...next[idx], label: e.target.value };
              onDraftChange({ ...draft, options: next });
            }}
            placeholder={`Option ${idx + 1}`}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        ))}
        {draft.options.length < 8 && (
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, options: [...draft.options, { label: '' }] })}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </button>
        )}
        <div className="rounded-lg border border-violet-200 bg-white/80 p-3">
          <p className="text-xs font-semibold text-violet-900">Voting deadline</p>
          <input
            type="datetime-local"
            value={draft.closesAt}
            onChange={(e) => onDraftChange({ ...draft, closesAt: e.target.value })}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {draft.closesAt && (
            <button
              type="button"
              onClick={() => onDraftChange({ ...draft, closesAt: '' })}
              className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Remove deadline
            </button>
          )}
        </div>
        <ResultsVisibilityPicker
          value={draft.resultsVisibility}
          onChange={(value) => onDraftChange({ ...draft, resultsVisibility: value })}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            loading={saving}
            disabled={!draft.question.trim() || draft.options.filter((o) => o.label.trim()).length < 2}
            onClick={onSave}
          >
            Save changes
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </li>
  );
}
