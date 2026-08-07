import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import MessageBubble from './BoardMessageBubble';
import BoardMessageComposer from './BoardMessageComposer';
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
import {
  buildBoardMessageThreads,
  countBoardMessages,
  visibleReplies,
} from './boardConversationThreads';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import {
  canContributeToBoard,
  canDeleteBoardConversationMessage,
  canEditBoardConversationMessage,
  canManageBoardSettings,
} from '../../../shared/utils/moduleAccess';
import { formatMentionToken, isPersistedMessageId } from './pipelineMessageUtils';
import { Activity, CornerDownRight, MessageSquare, Zap } from 'lucide-react';

type ConversationTab = 'chat' | 'activity' | 'automations';

interface BoardConversationModalProps {
  boardId: number;
  open: boolean;
  onClose: () => void;
  canContribute?: boolean;
  onOpenBoardSettings?: () => void;
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


export default function BoardConversationModal({
  boardId,
  open,
  onClose,
  canContribute = false,
  onOpenBoardSettings,
  board,
  boardAccess,
}: BoardConversationModalProps) {
  const user = useAppSelector((s) => s.auth.user);
  const { confirm } = useConfirm();
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const canContributeResolved = board
    ? canContributeToBoard(user, board, boardAccess)
    : canContribute;
  const canModerateConversation = canManageBoardSettings(user, board ?? {}, boardAccess);
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
      title="Board discussion"
      subtitle="Team chat, activity feed, and automations for this board"
      size="2xl"
    >
      <div className="flex max-h-[min(85vh,820px)] flex-col gap-4">
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
            {!canContributeResolved && (
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                You have viewer access — discussion is read-only. You cannot post, reply, react, or edit messages.
              </p>
            )}
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
                  <CustosellLoader />
                </div>
              ) : threads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">Start the discussion</p>
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
                    showActions: true,
                    canInteract: canContributeResolved,
                    canPinMessages: canModerateConversation,
                  };
                  const canEditRoot = canContributeResolved && canEditBoardConversationMessage(user, thread.root);
                  const canDeleteRoot = canContributeResolved && canDeleteBoardConversationMessage(
                    user,
                    thread.root,
                    board ?? {},
                    boardAccess,
                  );
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
                        onEdit={canEditRoot ? () => {
                          setEditingMessage(thread.root);
                          setEditBody(thread.root.body);
                          setReplyingTo(null);
                        } : undefined}
                        onDelete={() => void handleDelete(thread.root)}
                        onReply={canContributeResolved && !thread.root.is_system ? () => {
                          setReplyingTo(thread.root);
                          setEditingMessage(null);
                        } : undefined}
                        onPin={canModerateConversation ? () => handlePin(thread.root) : undefined}
                        onReact={(reaction) => handleReact(thread.root, reaction)}
                        onEmojiReact={(emoji) => handleEmojiReact(thread.root, emoji)}
                        canEditMessage={canEditRoot}
                        canDeleteMessage={canDeleteRoot}
                        {...bubbleProps}
                      />
                      {shown.map((reply) => {
                        const canEditReply = canContributeResolved && canEditBoardConversationMessage(user, reply);
                        const canDeleteReply = canContributeResolved && canDeleteBoardConversationMessage(
                          user,
                          reply,
                          board ?? {},
                          boardAccess,
                        );
                        return (
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
                            onEdit={canEditReply ? () => {
                              setEditingMessage(reply);
                              setEditBody(reply.body);
                              setReplyingTo(null);
                            } : undefined}
                            onDelete={() => void handleDelete(reply)}
                            onPin={canModerateConversation ? () => handlePin(reply) : undefined}
                            onReact={(reaction) => handleReact(reply, reaction)}
                            onEmojiReact={(emoji) => handleEmojiReact(reply, emoji)}
                            canEditMessage={canEditReply}
                            canDeleteMessage={canDeleteReply}
                            {...bubbleProps}
                          />
                        );
                      })}
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

            <BoardMessageComposer
              draft={draft}
              onDraftChange={handleDraftChange}
              onPost={() => void handlePost()}
              posting={postMessage.isPending}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              pendingFiles={pendingFiles}
              onRemoveFile={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
              onAddFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={() => setShowEmojiPicker((prev) => !prev)}
              onInsertEmoji={insertEmoji}
              mentionCandidates={mentionCandidates}
              onInsertMention={insertMention}
              viewer={!canContributeResolved}
            />
          </>
        )}

        {tab === 'activity' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {activityLoading ? (
              <div className="flex justify-center py-12">
                <CustosellLoader />
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
                    <div className="mt-2">
                      <UserIdentityChip
                        name={event.user.name}
                        avatar={event.user.avatar}
                        size="xs"
                        nameClassName="text-xs font-medium text-gray-600"
                      />
                    </div>
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
                <CustosellLoader />
              </div>
            ) : automations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <Zap className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">No discussion alerts yet</p>
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
