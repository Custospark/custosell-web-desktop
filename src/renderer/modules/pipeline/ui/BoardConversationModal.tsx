import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import {
  useBoardConversationActivity,
  useBoardConversationMessages,
  useDeleteBoardMessage,
  useMarkBoardConversationRead,
  usePostBoardMessage,
  useToggleBoardMessagePin,
  useToggleBoardMessageReaction,
  useUpdateBoardMessage,
} from '../api/usePipelineConversationQueries';
import { useBoardAutomations } from '../api/usePipelineAutomationQueries';
import { useBoardResourceMembers } from '../api/usePipelineResourceQueries';
import type { PipelineBoardMessage } from '../api/pipelineTypes';
import { pipelineInputClass } from './pipelineFormFields';
import {
  buildBoardMessageThreads,
  countBoardMessages,
  visibleReplies,
} from './boardConversationThreads';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  CONVERSATION_EMOJI_OPTIONS,
  formatMentionToken,
  isPersistedMessageId,
  renderMessageBody,
} from './pipelineMessageUtils';
import {
  Activity,
  CornerDownRight,
  Download,
  FileText,
  MessageSquare,
  Paperclip,
  Pin,
  Pencil,
  Send,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

type ConversationTab = 'chat' | 'activity' | 'automations';

interface BoardConversationModalProps {
  boardId: number;
  open: boolean;
  onClose: () => void;
  canContribute?: boolean;
  onOpenBoardSettings?: () => void;
}

function MessageBubble({
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
  pinning,
  onReact,
  onEmojiReact,
  showActions,
}: {
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
  pinning?: boolean;
  onReact: (reaction: 'like' | 'dislike') => void;
  onEmojiReact: (emoji: string) => void;
  showActions: boolean;
}) {
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {message.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            <UserIdentityChip
              name={message.user?.name ?? 'Team member'}
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
          {showActions && persisted && (
            <div className="flex shrink-0 items-center gap-1">
              {onReply && !editing && (
                <button
                  type="button"
                  onClick={onReply}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
                >
                  Reply
                </button>
              )}
              {message.can_pin && onPin && !editing && (
                <button
                  type="button"
                  onClick={onPin}
                  disabled={pinning}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Pin className="h-3.5 w-3.5" />
                  {message.is_pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {message.can_edit && !editing && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
              {message.can_delete && !editing && (
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
        {!editing && persisted && (
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

export default function BoardConversationModal({
  boardId,
  open,
  onClose,
  canContribute = false,
  onOpenBoardSettings,
}: BoardConversationModalProps) {
  const { confirm } = useConfirm();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ConversationTab>('chat');

  const { data: messages = [], isLoading, isFetching } = useBoardConversationMessages(boardId, open && tab === 'chat');
  const { data: activity = [], isLoading: activityLoading } = useBoardConversationActivity(boardId, open && tab === 'activity');
  const { data: automations = [], isLoading: automationsLoading } = useBoardAutomations(boardId, open && tab === 'automations');
  const { data: members = [] } = useBoardResourceMembers(boardId, open);

  const postMessage = usePostBoardMessage(boardId);
  const updateMessage = useUpdateBoardMessage(boardId);
  const deleteMessage = useDeleteBoardMessage(boardId);
  const toggleReaction = useToggleBoardMessageReaction(boardId);
  const togglePin = useToggleBoardMessagePin(boardId);
  const markRead = useMarkBoardConversationRead(boardId);

  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<PipelineBoardMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<PipelineBoardMessage | null>(null);
  const [editBody, setEditBody] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(() => new Set());

  const threads = useMemo(() => buildBoardMessageThreads(messages), [messages]);
  const totalMessages = countBoardMessages(messages);
  const latestPersistedMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const id = messages[i]?.id;
      if (isPersistedMessageId(id)) return id;
    }
    return undefined;
  }, [messages]);

  const mentionCandidates = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return members.filter((member) => member.name?.toLowerCase().includes(q)).slice(0, 6);
  }, [members, mentionQuery]);

  useEffect(() => {
    if (!open || !latestPersistedMessageId) return;
    void markRead.mutateAsync(latestPersistedMessageId);
    // markRead identity is stable enough; we only want to fire on new persisted messages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, latestPersistedMessageId]);

  useEffect(() => {
    if (!open || tab !== 'chat' || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, tab, messages.length, threads.length]);

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  const insertMention = (userId: number, name: string) => {
    setDraft((prev) => {
      const withoutPartial = prev.replace(/@[\w\s]*$/, '');
      return `${withoutPartial}${formatMentionToken(userId, name)} `;
    });
    setMentionQuery(null);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const match = value.match(/@([\w\s]*)$/);
    setMentionQuery(match ? match[1].trim() : null);
  };

  const handlePost = async () => {
    if (!draft.trim() && pendingFiles.length === 0) return;
    await postMessage.mutateAsync({
      body: draft.trim() || '(attachment)',
      parent_id: replyingTo?.id && isPersistedMessageId(replyingTo.id) ? replyingTo.id : null,
      files: pendingFiles,
    });
    setDraft('');
    setPendingFiles([]);
    if (replyingTo && isPersistedMessageId(replyingTo.id)) {
      setExpandedThreads((prev) => new Set(prev).add(replyingTo.id));
      setReplyingTo(null);
    }
  };

  const handleDelete = async (message: PipelineBoardMessage) => {
    if (!isPersistedMessageId(message.id)) return;
    const ok = await confirm({
      title: 'Delete message?',
      message: 'This message will be removed for everyone on this board.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteMessage.mutateAsync(message.id);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editBody.trim() || !isPersistedMessageId(editingMessage.id)) return;
    await updateMessage.mutateAsync({ id: editingMessage.id, body: editBody.trim() });
    setEditingMessage(null);
    setEditBody('');
  };

  const handleReact = (message: PipelineBoardMessage, reaction: 'like' | 'dislike') => {
    if (!isPersistedMessageId(message.id)) return;
    const next = message.reactions?.user_reaction === reaction ? null : reaction;
    void toggleReaction.mutateAsync({ messageId: message.id, reaction: next });
  };

  const handleEmojiReact = (message: PipelineBoardMessage, emoji: string) => {
    if (!isPersistedMessageId(message.id)) return;
    const next = message.reactions?.user_reaction === emoji ? null : emoji;
    void toggleReaction.mutateAsync({ messageId: message.id, reaction: next });
  };

  const handlePin = (message: PipelineBoardMessage) => {
    if (!isPersistedMessageId(message.id)) return;
    void togglePin.mutateAsync(message.id);
  };

  const showLoading = isLoading || (isFetching && messages.length === 0);

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        setDraft('');
        setPendingFiles([]);
        setReplyingTo(null);
        setEditingMessage(null);
        setTab('chat');
        onClose();
      }}
      title="Board conversation"
      subtitle="Team chat, activity feed, and automations for this board"
      size="lg"
    >
      <div className="flex max-h-[min(70vh,640px)] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
          {([
            ['chat', 'Chat', MessageSquare],
            ['activity', 'Activity', Activity],
            ['automations', 'Automations', Zap],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'chat' && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="relative inline-flex">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                {totalMessages > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                    {totalMessages > 99 ? '99+' : totalMessages}
                  </span>
                )}
              </span>
              <span>
                <span className="font-semibold text-gray-900">{totalMessages}</span> message
                {totalMessages === 1 ? '' : 's'}
              </span>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {showLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : threads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">Start the conversation</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Share updates, @mention teammates, attach files, and pin key decisions.
                  </p>
                </div>
              ) : (
                threads.map((thread) => {
                  const expanded = expandedThreads.has(thread.root.id);
                  const { shown, hiddenCount } = visibleReplies(thread.replies, expanded);
                  const bubbleProps = {
                    deleting: deleteMessage.isPending,
                    reacting: toggleReaction.isPending,
                    pinning: togglePin.isPending,
                    showActions: true,
                  };
                  return (
                    <div key={thread.root.id} className="space-y-2">
                      <MessageBubble
                        message={thread.root}
                        editing={editingMessage?.id === thread.root.id}
                        saving={updateMessage.isPending}
                        editBody={editingMessage?.id === thread.root.id ? editBody : undefined}
                        onEditBodyChange={setEditBody}
                        onSaveEdit={() => void saveEdit()}
                        onCancelEdit={() => {
                          setEditingMessage(null);
                          setEditBody('');
                        }}
                        onEdit={() => {
                          setEditingMessage(thread.root);
                          setEditBody(thread.root.body);
                          setReplyingTo(null);
                        }}
                        onDelete={() => void handleDelete(thread.root)}
                        onReply={canContribute ? () => {
                          setReplyingTo(thread.root);
                          setEditingMessage(null);
                        } : undefined}
                        onPin={() => handlePin(thread.root)}
                        onReact={(reaction) => handleReact(thread.root, reaction)}
                        onEmojiReact={(emoji) => handleEmojiReact(thread.root, emoji)}
                        {...bubbleProps}
                      />
                      {shown.map((reply) => (
                        <MessageBubble
                          key={reply.id}
                          message={reply}
                          isReply
                          editing={editingMessage?.id === reply.id}
                          saving={updateMessage.isPending}
                          editBody={editingMessage?.id === reply.id ? editBody : undefined}
                          onEditBodyChange={setEditBody}
                          onSaveEdit={() => void saveEdit()}
                          onCancelEdit={() => {
                            setEditingMessage(null);
                            setEditBody('');
                          }}
                          onEdit={() => {
                            setEditingMessage(reply);
                            setEditBody(reply.body);
                            setReplyingTo(null);
                          }}
                          onDelete={() => void handleDelete(reply)}
                          onReact={(reaction) => handleReact(reply, reaction)}
                          onEmojiReact={(emoji) => handleEmojiReact(reply, emoji)}
                          {...bubbleProps}
                        />
                      ))}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedThreads((prev) => new Set(prev).add(thread.root.id))}
                          className="ml-6 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <CornerDownRight className="h-3.5 w-3.5" />
                          Show {hiddenCount} more repl{hiddenCount === 1 ? 'y' : 'ies'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="relative shrink-0 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              {!canContribute ? (
                <p className="text-xs text-blue-900">
                  You have viewer access — you can read board conversation but cannot post messages.
                </p>
              ) : (
              <>
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-blue-100">
                  <span>
                    Replying to <span className="font-semibold text-gray-800">{replyingTo.user?.name ?? 'message'}</span>
                  </span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="text-blue-600 hover:text-blue-800">
                    Cancel
                  </button>
                </div>
              )}
              {mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {mentionCandidates.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => insertMention(member.id, member.name ?? 'User')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {showEmojiPicker && (
                <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-2">
                  {CONVERSATION_EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="rounded-md px-2 py-1 text-lg hover:bg-gray-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {pendingFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-gray-200">
                      <Paperclip className="h-3 w-3" />
                      {file.name}
                      <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder={replyingTo ? 'Write a reply… Use @ to mention' : 'Message the board team… Use @ to mention'}
                    rows={2}
                    className={cn(pipelineInputClass, 'min-h-[72px] resize-y text-sm')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handlePost();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                    >
                      <Smile className="h-4 w-4" />
                      Emoji
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                    >
                      <Paperclip className="h-4 w-4" />
                      Attach
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) setPendingFiles((prev) => [...prev, ...files]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="self-end"
                  onClick={() => void handlePost()}
                  disabled={(!draft.trim() && pendingFiles.length === 0) || postMessage.isPending}
                  loading={postMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Ctrl+Enter to send · @mention teammates · Pin key decisions from message actions
              </p>
              </>
              )}
            </div>
          </>
        )}

        {tab === 'activity' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {activityLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No board activity yet.</p>
            ) : (
              activity.map((event) => (
                <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      {event.body && <p className="mt-1 text-sm text-gray-600">{event.body}</p>}
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{event.event_type}</p>
                    </div>
                    {event.created_at && (
                      <span className="shrink-0 text-[11px] text-gray-400">{formatShiftDateTime(event.created_at)}</span>
                    )}
                  </div>
                  {event.user?.name && (
                    <p className="mt-2 text-xs text-gray-500">by {event.user.name}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'automations' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
              Alerts are tied to this board&apos;s columns. Manage them in{' '}
              {onOpenBoardSettings ? (
                <button type="button" onClick={onOpenBoardSettings} className="font-semibold underline">
                  Board settings
                </button>
              ) : (
                <span className="font-semibold">Board settings</span>
              )}
              .
            </p>
            {automationsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : automations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <Zap className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">No conversation alerts yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Turn on alerts per column when you set up or edit this board.
                </p>
              </div>
            ) : (
              automations.map((automation) => (
                <div key={automation.id} className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-start gap-3">
                    {automation.trigger_stage?.color && (
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: automation.trigger_stage.color }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {automation.trigger_stage?.name ?? automation.name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{automation.name}</p>
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        {automation.action_body}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
