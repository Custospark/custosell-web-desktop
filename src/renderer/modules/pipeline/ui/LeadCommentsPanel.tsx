import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { useAddPipelineActivity, useDeletePipelineActivity } from '../api/usePipelineQueries';
import { pipelineInputClass } from './pipelineFormFields';
import {
  ACTIVITY_ICONS,
  activityTypeLabel,
  COMMENT_TYPES,
  USER_COMMENT_TYPES,
} from './pipelineActivityMeta';
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
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<'comment' | 'call' | 'email' | 'meeting'>('comment');

  const userComments = activities.filter((a) => USER_COMMENT_TYPES.has(a.type));

  const handlePost = async () => {
    if (!note.trim()) return;
    await addActivity.mutateAsync({
      leadId,
      type: activityType,
      body: note.trim(),
      boardId,
    });
    setNote('');
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

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a comment…"
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
          Post
        </Button>
      </div>

      <ul className="max-h-[min(50vh,360px)] space-y-3 overflow-y-auto pr-1">
        {userComments.length === 0 ? (
          <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-xs text-gray-500">
            No comments yet — be the first to leave one.
          </li>
        ) : (
          userComments.map((a) => {
            const Icon = ACTIVITY_ICONS[a.type] ?? MessageSquare;
            const authorName = a.user?.name ?? 'Unknown user';
            const canDelete = canDeletePipelineComment(user, a, board ?? {}, boardAccess);
            return (
              <li key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <UserIdentityChip
                      name={authorName}
                      avatar={a.user?.avatar}
                      size="sm"
                      nameClassName="text-sm font-semibold text-gray-900"
                    />
                    {!compact && (
                      <span className="inline-flex items-center gap-1 text-[11px] capitalize text-gray-500">
                        <Icon className="h-3 w-3" />
                        {activityTypeLabel(a.type)}
                      </span>
                    )}
                    {a.created_at && (
                      <span className="text-[11px] text-gray-400">{formatShiftDateTime(a.created_at)}</span>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(a)}
                      disabled={deleteActivity.isPending}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete comment"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {a.body && <p className="mt-1.5 text-sm leading-relaxed text-gray-800">{a.body}</p>}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
