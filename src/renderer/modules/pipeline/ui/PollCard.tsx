import { UserAvatar } from '../../../shared/components/UserAvatar';
import { cn } from '../../../shared/utils/cn';
import type { PipelinePoll } from '../api/pipelineTypes';
import { formatPollDeadline } from '../api/pollDateTimeUtils';
import { PipelineUserAttribution } from './pipelineUserAttribution';
import { CheckCircle2, Circle, Clock, Undo2, Users } from 'lucide-react';

export interface PollCardProps {
  poll: PipelinePoll;
  currentUserId?: number | null;
  canContribute: boolean;
  onStartEdit: (poll: PipelinePoll) => void;
  onVote: (pollId: number, optionId: number) => void;
  onRemoveVote: (pollId: number) => void;
  onDelete: (pollId: number) => void;
  voting: boolean;
  removingVote: boolean;
}

export default function PollCard({
  poll,
  currentUserId,
  canContribute,
  onStartEdit,
  onVote,
  onRemoveVote,
  onDelete,
  voting,
  removingVote,
}: PollCardProps) {
  const canSeeResults = poll.can_see_results ?? true;
  const totalVotes = poll.total_votes ?? poll.votes?.length ?? 0;
  const myVotes = new Set(
    (poll.votes ?? []).filter((v) => v.user_id === currentUserId).map((v) => v.option_id),
  );
  const canManagePoll = poll.can_manage_poll === true;
  const canEditPoll = poll.can_edit_poll === true;
  const canDismissPoll = poll.can_dismiss === true;
  const isClosed = poll.is_closed === true;
  const deadlineLabel = formatPollDeadline(poll.closes_at);
  const needsVote = !poll.user_has_voted && !isClosed;
  const canVote = canContribute && !isClosed && poll.can_vote !== false;
  const canRemoveOwnVote = poll.can_remove_own_vote === true;

  return (
    <li
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm',
        isClosed
          ? 'border-gray-300 bg-gray-50/80'
          : needsVote
            ? 'border-violet-300 ring-1 ring-violet-200'
            : 'border-gray-200',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{poll.question}</h3>
          <div className="mt-1.5">
            <PipelineUserAttribution
              user={poll.creator}
              timestamp={poll.created_at}
              suffix={
                <>
                  {deadlineLabel && (
                    <span className={cn(isClosed ? 'text-red-600' : 'text-gray-500')}>
                      · <Clock className="mr-0.5 inline h-3 w-3" />
                      {isClosed ? 'Closed' : 'Closes'} {deadlineLabel}
                    </span>
                  )}
                  {canSeeResults ? (
                    <span className="text-gray-500">
                      · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                    </span>
                  ) : poll.results_visibility === 'creator_only' ? (
                    <span className="text-violet-600">· Results hidden from team</span>
                  ) : null}
                </>
              }
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isClosed ? (
            <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-700 ring-1 ring-gray-300">
              Closed
            </span>
          ) : needsVote && canVote ? (
            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Your vote
            </span>
          ) : needsVote && !canVote ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200">
              View only
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Voted
            </span>
          )}
          {canEditPoll && (
            <button
              type="button"
              onClick={() => onStartEdit(poll)}
              className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
              title="Edit poll"
            >
              Edit
            </button>
          )}
          {canContribute && canManagePoll && (
            <button
              type="button"
              onClick={() => onDelete(poll.id)}
              className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
              title="Delete poll for everyone"
            >
              Delete for all
            </button>
          )}
          {canContribute && canDismissPoll && (
            <button
              type="button"
              onClick={() => onDelete(poll.id)}
              className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
              title="Remove from my view"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {needsVote && canVote && (
        <p className="mt-2 text-sm font-medium text-violet-800">
          Choose one option - your vote saves immediately.
        </p>
      )}

      {isClosed && !poll.user_has_voted && (
        <p className="mt-2 text-sm font-medium text-gray-600">
          Voting closed{deadlineLabel ? ` on ${deadlineLabel}` : ''}.
        </p>
      )}

      {canRemoveOwnVote && !needsVote && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onRemoveVote(poll.id)}
            disabled={removingVote}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Remove my vote
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {(poll.options ?? []).map((option) => {
          const count = option.votes_count ?? (poll.votes ?? []).filter((v) => v.option_id === option.id).length;
          const pct = canSeeResults && totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = myVotes.has(option.id);
          const optionClassName = cn(
            'relative flex min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-xl border-2 px-4 py-3 text-left text-sm font-medium',
            voted
              ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
              : needsVote && canVote
                ? 'border-violet-200 bg-white text-gray-800 hover:border-violet-400 hover:bg-violet-50'
                : 'border-gray-200 bg-gray-50/50 text-gray-700',
          );
          const optionContent = (
            <>
              {canSeeResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-violet-100/60"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative shrink-0">
                {voted ? (
                  <CheckCircle2 className="h-5 w-5 text-violet-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </span>
              <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate">{option.label}</span>
                {canSeeResults ? (
                  <span className="shrink-0 text-xs font-semibold text-gray-600">
                    {count} · {pct}%
                  </span>
                ) : voted ? (
                  <span className="shrink-0 text-xs font-semibold text-violet-600">Your pick</span>
                ) : needsVote && canVote ? (
                  <span className="shrink-0 text-xs font-semibold text-violet-500">Tap to vote</span>
                ) : null}
              </span>
            </>
          );
          return (
            <button
              key={option.id}
              type="button"
              disabled={!canVote || voting}
              onClick={canVote ? () => onVote(poll.id, option.id) : undefined}
              className={cn(
                optionClassName,
                canVote ? 'transition-all active:scale-[0.99]' : 'cursor-default',
              )}
            >
              {optionContent}
            </button>
          );
        })}
      </div>

      {canManagePoll && (poll.participants?.length ?? 0) > 0 && (
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Users className="h-3.5 w-3.5" />
            Team participation
          </p>
          <ul className="space-y-2">
            {poll.participants!.map((participant) => (
              <li
                key={participant.user.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    name={participant.user.name ?? 'Team member'}
                    avatar={participant.user.avatar}
                    size="xs"
                  />
                  <span className="truncate font-medium text-gray-800">
                    {participant.user.name ?? 'Team member'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {participant.has_voted ? (
                    <span className="text-violet-700">
                      {participant.voted_option_label ?? 'Voted'}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not voted</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
