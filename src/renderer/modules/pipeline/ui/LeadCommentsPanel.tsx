import { useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import { CornerDownRight, MessageSquare, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { useAddPipelineActivity, useDeletePipelineActivity } from '../api/usePipelineQueries';
import { useToggleActivityReaction } from '../api/usePipelineCollaborationQueries';
import { pipelineInputClass } from './pipelineFormFields';
import {
  ACTIVITY_ICONS,
  activityTypeLabel,
  COMMENT_TYPES,
} from './pipelineActivityMeta';
import {
  buildCommentThreads,
  countUserComments,
  visibleReplies,
} from './pipelineCommentThreads';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canDeletePipelineComment } from '../../../shared/utils/moduleAccess';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';

interface LeadCommentsPanelProps {
  leadId: number;
  boardId?: number;
  activities?: PipelineLeadActivity[];
  compact?: boolean;
  board?: {
    created_by?: number | null;
    project_id?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  };
  boardAccess?: {
    projectCreatedBy?: number | null;
    projectMembers?: { user_id: number; role: string }[];
  };
}

function CommentBubble({
  activity,
  compact,
  isReply,
  canDelete,
  onDelete,
  onReply,
  deleting,
  onReact,
  reacting,
}: {
  activity: PipelineLeadActivity;
  compact: boolean;
  isReply?: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
  deleting: boolean;
  onReact: (reaction: 'like' | 'dislike') => void;
  reacting: boolean;
}) {
  const Icon = ACTIVITY_ICONS[activity.type] ?? MessageSquare;
  const authorName = activity.user?.name ?? 'Unknown user';

  return (
    <div className={cn('group', isReply && 'ml-6 border-l-2 border-blue-100 pl-3')}>
      <div
        className={cn(
          'rounded-xl border p-3',
          isReply ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50/80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <UserIdentityChip
              name={authorName}
              avatar={activity.user?.avatar}
              size="sm"
              nameClassName="text-sm font-semibold text-gray-900"
            />
            {!compact && !isReply && (
              <span className="inline-flex items-center gap-1 text-[11px] capitalize text-gray-500">
                <Icon className="h-3 w-3" />
                {activityTypeLabel(activity.type)}
              </span>
            )}
            {activity.created_at && (
              <span className="text-[11px] text-gray-400">{formatShiftDateTime(activity.created_at)}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onReply && (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-colors hover:bg-blue-100 hover:text-blue-700"
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                title="Delete comment"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
        {activity.body && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
            {activity.body}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={reacting}
            onClick={() => onReact('like')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 transition-colors',
              activity.reactions?.user_reaction === 'like'
                ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                : 'bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100',
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {activity.reactions?.likes ?? 0}
          </button>
          <button
            type="button"
            disabled={reacting}
            onClick={() => onReact('dislike')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 transition-colors',
              activity.reactions?.user_reaction === 'dislike'
                ? 'bg-orange-100 text-orange-700 ring-orange-200'
                : 'bg-orange-50 text-orange-600 ring-orange-100 hover:bg-orange-100',
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            {activity.reactions?.dislikes ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadCommentsPanel({
  leadId,
  boardId,
  activities = [],
  compact = false,
  board,
  boardAccess,
}: LeadCommentsPanelProps) {
  const user = useAppSelector((s) => s.auth.user);
  const { confirm } = useConfirm();
  const addActivity = useAddPipelineActivity();
  const deleteActivity = useDeletePipelineActivity();
  const toggleReaction = useToggleActivityReaction(leadId, boardId);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<'comment' | 'call' | 'email' | 'meeting'>('comment');
  const [replyingTo, setReplyingTo] = useState<PipelineLeadActivity | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(() => new Set());

  const threads = useMemo(() => buildCommentThreads(activities), [activities]);
  const totalComments = countUserComments(activities);

  const handlePost = async () => {
    if (!note.trim()) return;
    await addActivity.mutateAsync({
      leadId,
      type: activityType,
      body: note.trim(),
      boardId,
      parentId: replyingTo?.id ?? null,
    });
    setNote('');
    if (replyingTo) {
      setExpandedThreads((prev) => new Set(prev).add(replyingTo.id));
      setReplyingTo(null);
    }
  };

  const handleDelete = async (activity: PipelineLeadActivity) => {
    const ok = await confirm({
      title: 'Delete comment?',
      message: 'This comment will be removed for everyone on this board.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteActivity.mutateAsync({
      activityId: activity.id,
      leadId,
      boardId,
    });
  };

  const canDelete = (activity: PipelineLeadActivity) =>
    canDeletePipelineComment(user, activity, board ?? {}, boardAccess);

  const handleReact = (activity: PipelineLeadActivity, reaction: 'like' | 'dislike') => {
    const next = activity.reactions?.user_reaction === reaction ? null : reaction;
    void toggleReaction.mutateAsync({ activityId: activity.id, reaction: next });
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          {COMMENT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActivityType(value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                activityType === value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Replying to <strong>{replyingTo.user?.name ?? 'comment'}</strong>
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="shrink-0 font-medium text-blue-600 hover:text-blue-800"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={replyingTo ? 'Write a reply…' : 'Write a comment…'}
            rows={compact ? 2 : 3}
            className={cn(pipelineInputClass, 'min-h-[72px] resize-y py-2.5 pl-10')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handlePost();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={handlePost}
          loading={addActivity.isPending}
          disabled={!note.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 self-end"
          size="sm"
        >
          <Send className="h-4 w-4" />
          {replyingTo ? 'Reply' : 'Post'}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{totalComments} comment{totalComments === 1 ? '' : 's'}</span>
        <span className="hidden sm:inline">Newest first · Ctrl+Enter to send</span>
      </div>

      <ul className="max-h-[min(55vh,420px)] space-y-4 overflow-y-auto pr-1">
        {threads.length === 0 ? (
          <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-xs text-gray-500">
            No comments yet — be the first to leave one.
          </li>
        ) : (
          threads.map(({ root, replies }) => {
            const expanded = expandedThreads.has(root.id);
            const { shown, hiddenCount } = visibleReplies(replies, expanded);
            return (
              <li key={root.id} className="space-y-2">
                <CommentBubble
                  activity={root}
                  compact={compact}
                  canDelete={canDelete(root)}
                  deleting={deleteActivity.isPending}
                  onDelete={() => void handleDelete(root)}
                  onReply={() => {
                    setReplyingTo(root);
                    setActivityType('comment');
                  }}
                  onReact={(reaction) => handleReact(root, reaction)}
                  reacting={toggleReaction.isPending}
                />
                {shown.length > 0 && (
                  <div className="space-y-2">
                    {shown.map((reply) => (
                      <CommentBubble
                        key={reply.id}
                        activity={reply}
                        compact={compact}
                        isReply
                        canDelete={canDelete(reply)}
                        deleting={deleteActivity.isPending}
                        onDelete={() => void handleDelete(reply)}
                        onReact={(reaction) => handleReact(reply, reaction)}
                        reacting={toggleReaction.isPending}
                      />
                    ))}
                  </div>
                )}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedThreads((prev) => new Set(prev).add(root.id))}
                    className="ml-6 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Show {hiddenCount} more repl{hiddenCount === 1 ? 'y' : 'ies'}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
