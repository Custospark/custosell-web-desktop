import { Button } from '../../../shared/components/buttons/Button';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import type { PipelineBoardMessage } from '../api/pipelineTypes';
import { pipelineInputClass } from './pipelineFormFields';
import { isPersistedMessageId, renderMessageBody } from './pipelineMessageUtils';
import {
  Download,
  FileText,
  Pencil,
  Pin,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

interface MessageBubbleProps {
  message: PipelineBoardMessage;
  isReply?: boolean;
  editing?: boolean;
  saving?: boolean;
  editBody?: string;
  onEditBodyChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onReply?: () => void;
  onPin?: () => void;
  deleting: boolean;
  reacting: boolean;
  onReact: (reaction: 'like' | 'dislike') => void;
  onEmojiReact: (emoji: string) => void;
  showActions: boolean;
  canInteract: boolean;
  canPinMessages: boolean;
  canEditMessage: boolean;
  canDeleteMessage: boolean;
}

export default function MessageBubble({
  message,
  isReply,
  editing,
  saving,
  editBody,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  onEdit,
  onDelete,
  onReply,
  onPin,
  deleting,
  reacting,
  onReact,
  onEmojiReact,
  showActions,
  canInteract,
  canPinMessages,
  canEditMessage,
  canDeleteMessage,
}: MessageBubbleProps) {
  const persisted = isPersistedMessageId(message.id);
  const displayBody = renderMessageBody(message.body, message.mentions);
  const emojiCounts = message.reactions?.emoji_counts ?? {};

  return (
    <div
      className={cn(
        'group',
        isReply && 'ml-6 border-l-2 border-blue-100 pl-3',
        message.is_pinned && 'rounded-xl ring-2 ring-amber-200/80',
      )}
    >
      <div
        className={cn(
          'rounded-xl border p-3',
          message.is_pinned ? 'border-amber-200 bg-amber-50/50' : isReply ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50/80',
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {message.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            <UserIdentityChip
              name={message.user?.name ?? (message.is_system ? 'Automation' : 'Team member')}
              avatar={message.user?.avatar}
              size="sm"
              nameClassName="text-sm font-semibold text-gray-900"
            />
            {message.created_at && (
              <span className="text-[11px] text-gray-400">{formatShiftDateTime(message.created_at)}</span>
            )}
            {message.edited_at && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Edited</span>
            )}
            {!persisted && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-blue-500">Sending…</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
            {message.is_system && (
              <span
                className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 py-1"
                title={message.user?.name ? `Automation by ${message.user.name}` : 'Automation'}
              >
                <span className="inline-flex items-center -space-x-2">
                  <UserAvatar
                    name={message.user?.name ?? 'Team member'}
                    avatar={message.user?.avatar}
                    size="xs"
                    className="ring-violet-100"
                  />
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-violet-100">
                    <Zap className="h-3 w-3" />
                  </span>
                </span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                  Automation
                </span>
              </span>
            )}
            {showActions && persisted && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {canInteract && onReply && !editing && (
                  <button
                    type="button"
                    onClick={onReply}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
                  >
                    Reply
                  </button>
                )}
                {canPinMessages && onPin && !editing && (
                  <button
                    type="button"
                    onClick={onPin}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {message.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {canEditMessage && !editing && onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canDeleteMessage && !editing && (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
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
              <Button type="button" size="sm" loading={saving} disabled={!editBody?.trim()} onClick={() => void onSaveEdit?.()}>
                Save
              </Button>
              <button type="button" onClick={onCancelEdit} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{displayBody}</p>
        )}
        {(message.attachments ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(message.attachments ?? []).map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span className="max-w-[160px] truncate">{attachment.file_name}</span>
                <Download className="h-3 w-3 text-gray-400" />
              </a>
            ))}
          </div>
        )}
        {!editing && persisted && canInteract && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={reacting}
              onClick={() => onReact('like')}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 transition-colors',
                message.reactions?.user_reaction === 'like'
                  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                  : 'bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100',
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {message.reactions?.likes ?? 0}
            </button>
            <button
              type="button"
              disabled={reacting}
              onClick={() => onReact('dislike')}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 transition-colors',
                message.reactions?.user_reaction === 'dislike'
                  ? 'bg-orange-100 text-orange-700 ring-orange-200'
                  : 'bg-orange-50 text-orange-600 ring-orange-100 hover:bg-orange-100',
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {message.reactions?.dislikes ?? 0}
            </button>
            {Object.entries(emojiCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                disabled={reacting}
                onClick={() => onEmojiReact(emoji)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 transition-colors',
                  message.reactions?.user_reaction === emoji
                    ? 'bg-blue-100 text-blue-800 ring-blue-200'
                    : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50',
                )}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}