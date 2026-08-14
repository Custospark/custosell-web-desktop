import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import { CornerDownRight, Loader2, MessageSquare, Pencil, Send, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { useAddPipelineActivity, useDeletePipelineActivity, useUpdatePipelineActivity } from '../api/usePipelineQueries';
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
import { canContributeToBoard, canDeletePipelineComment, canEditPipelineComment } from '../../../shared/utils/moduleAccess';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';

interface LeadCommentsPanelProps {
  leadId: number;
  boardId?: number;
  activities?: PipelineLeadActivity[];
  compact?: boolean;
  isSyncing?: boolean;
  expectedTotalComments?: number | null;
  board?: {
    can_manage_settings?: boolean;
    can_contribute?: boolean;
    current_member_role?: 'viewer' | 'contributor' | 'manager' | null;
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
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onReply,
  deleting,
  editing,
  saving,
  editBody,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  onReact,
  reacting,
  canInteract,
}: {
  activity: PipelineLeadActivity;
  compact: boolean;
  isReply?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  onReply?: () => void;
  deleting: boolean;
  editing?: boolean;
  saving?: boolean;
  editBody?: string;
  onEditBodyChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onReact: (reaction: 'like' | 'dislike') => void;
  reacting: boolean;
  canInteract: boolean;
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
            {onReply && !editing && (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-colors hover:bg-blue-100 hover:text-blue-700"
              >
                Reply
              </button>
            )}
            {canEdit && !editing && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100"
                title="Edit comment"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {canDelete && !editing && (
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
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editBody ?? ''}
              onChange={(e) => onEditBodyChange?.(e.target.value)}
              rows={3}
              className={cn(pipelineInputClass, 'min-h-[72px] resize-y text-sm')}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                loading={saving}
                disabled={!editBody?.trim()}
                onClick={() => void onSaveEdit?.()}
              >
                Save
              </Button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          activity.body && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
              {activity.body}
            </p>
          )
        )}
        {!editing && canInteract && (
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
        )}
      </div>
    </div>
  );
}

export default function LeadCommentsPanel({
  leadId,
  boardId,
  activities = [],
  compact = false,
  isSyncing = false,
  expectedTotalComments,
  board,
  boardAccess,
}: LeadCommentsPanelProps) {
  const user = useAppSelector((s) => s.auth.user);
  const { confirm } = useConfirm();
  const canContribute = board ? canContributeToBoard(user, board, boardAccess) : false;
  const addActivity = useAddPipelineActivity();
  const updateActivity = useUpdatePipelineActivity();
  const deleteActivity = useDeletePipelineActivity();
  const toggleReaction = useToggleActivityReaction(leadId);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<'comment' | 'call' | 'email' | 'meeting'>('comment');
  const [replyingTo, setReplyingTo] = useState<PipelineLeadActivity | null>(null);
  const [editingActivity, setEditingActivity] = useState<PipelineLeadActivity | null>(null);
  const [editBody, setEditBody] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(() => new Set());

  const threads = useMemo(() => buildCommentThreads(activities), [activities]);
  const listRef = useRef<HTMLUListElement>(null);
  const loadedComments = countUserComments(activities);
  const totalComments = expectedTotalComments != null
    ? Math.max(expectedTotalComments, loadedComments)
    : loadedComments;
  const isHydratingComments = isSyncing && totalComments > loadedComments;

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [threads.length]);

  const handlePost = async () => {
    if (!canContribute || !note.trim()) return;
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

  const startEdit = (activity: PipelineLeadActivity) => {
    setEditingActivity(activity);
    setEditBody(activity.body ?? '');
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingActivity(null);
    setEditBody('');
  };

  const saveEdit = async () => {
    if (!editingActivity || !editBody.trim()) return;
    await updateActivity.mutateAsync({
      activityId: editingActivity.id,
      body: editBody.trim(),
      leadId,
      boardId,
    });
    cancelEdit();
  };

  const canDelete = (activity: PipelineLeadActivity) =>
    canDeletePipelineComment(user, activity, board ?? {}, boardAccess);

  const canEdit = (activity: PipelineLeadActivity) =>
    canEditPipelineComment(user, activity);

  const handleReact = (activity: PipelineLeadActivity, reaction: 'like' | 'dislike') => {
    const next = activity.reactions?.user_reaction === reaction ? null : reaction;
    void toggleReaction.mutateAsync({ activityId: activity.id, reaction: next });
  };

  const commentBubbleProps = (activity: PipelineLeadActivity, isReply?: boolean) => ({
    activity,
    compact,
    isReply,
    canEdit: canContribute && canEdit(activity),
    canDelete: canContribute && canDelete(activity),
    editing: editingActivity?.id === activity.id,
    saving: updateActivity.isPending,
    editBody: editingActivity?.id === activity.id ? editBody : undefined,
    onEditBodyChange: setEditBody,
    onSaveEdit: () => void saveEdit(),
    onCancelEdit: cancelEdit,
    onEdit: () => startEdit(activity),
    deleting: deleteActivity.isPending,
    onDelete: () => void handleDelete(activity),
    onReact: (reaction: 'like' | 'dislike') => handleReact(activity, reaction),
    reacting: toggleReaction.isPending,
    canInteract: canContribute,
  });

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {!canContribute ? (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          You have viewer access - you can read comments but cannot post or reply.
        </p>
      ) : (
      <>
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
        <span>
          {isHydratingComments
            ? `Showing ${loadedComments} of ${totalComments} comments`
            : `${totalComments} comment${totalComments === 1 ? '' : 's'}`}
        </span>
        <span className="hidden sm:inline">Newest at the bottom · Ctrl+Enter to send</span>
      </div>
      </>
      )}

      {isHydratingComments && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading latest comments…
        </div>
      )}

      <ul ref={listRef} className="max-h-[min(55vh,420px)] space-y-4 overflow-y-auto pr-1">
        {threads.length === 0 ? (
          isHydratingComments ? (
            <li className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 py-8 text-center text-xs text-blue-800">
              Loading comments…
            </li>
          ) : (
            <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-xs text-gray-500">
              No comments yet - be the first to leave one.
            </li>
          )
        ) : (
          threads.map(({ root, replies }) => {
            const expanded = expandedThreads.has(root.id);
            const { shown, hiddenCount } = visibleReplies(replies, expanded);
            return (
              <li key={root.id} className="space-y-2">
                <CommentBubble
                  {...commentBubbleProps(root)}
                  onReply={canContribute ? () => {
                    setReplyingTo(root);
                    setActivityType('comment');
                  } : undefined}
                />
                {shown.length > 0 && (
                  <div className="space-y-2">
                    {shown.map((reply) => (
                      <CommentBubble
                        key={reply.id}
                        {...commentBubbleProps(reply, true)}
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
