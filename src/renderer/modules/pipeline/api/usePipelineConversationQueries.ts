import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { notificationKeys } from '../../notifications/api/NotificationQueries';
import type {
  PipelineActivityReactions,
  PipelineBoardActivityEvent,
  PipelineBoardConversationSummary,
  PipelineBoardMessage,
  PipelineBoardMessageAttachment,
  PipelineBoardTemplate,
} from './pipelineTypes';
import {
  pipelineConversationKeys,
  pipelineKeys,
  pipelineTemplateKeys,
  PIPELINE_KANBAN_POLL_MS,
} from './pipelineQueryKeys';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { isPersistedMessageId } from '../ui/pipelineMessageUtils';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

let optimisticMessageId = -1;
function nextOptimisticMessageId(): number {
  optimisticMessageId -= 1;
  return optimisticMessageId;
}

export function useBoardConversationSummary(boardId: number, enabled = true, poll = false) {
  return useQuery({
    queryKey: pipelineConversationKeys.summary(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_CONVERSATION_SUMMARY(boardId));
      return (data as { data: PipelineBoardConversationSummary }).data;
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
    refetchInterval: poll && enabled && boardId > 0 ? PIPELINE_KANBAN_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useBoardConversationMessages(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineConversationKeys.messages(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_CONVERSATION_MESSAGES(boardId));
      return normalizeList<PipelineBoardMessage>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 10_000,
    refetchInterval: enabled && boardId > 0 ? 20_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useBoardConversationActivity(boardId: number, enabled = true) {
  return useQuery({
    queryKey: pipelineConversationKeys.activity(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_CONVERSATION_ACTIVITY(boardId));
      return normalizeList<PipelineBoardActivityEvent>(data);
    },
    enabled: enabled && boardId > 0,
    staleTime: 15_000,
  });
}

export function useBoardTemplates(workspace: 'pipeline' | 'estimates', enabled = true) {
  return useQuery({
    queryKey: pipelineTemplateKeys.list(workspace),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_TEMPLATES, { params: { workspace } });
      return normalizeList<PipelineBoardTemplate>(data);
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useMarkBoardConversationRead(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lastReadMessageId?: number) => {
      if (lastReadMessageId !== undefined && !isPersistedMessageId(lastReadMessageId)) {
        return { last_read_message_id: null, unread_count: 0 };
      }
      const { data } = await axiosInstance.post(PIPELINE.BOARD_CONVERSATION_READ(boardId), {
        last_read_message_id: lastReadMessageId ?? null,
      });
      return (data as { data: { last_read_message_id: number | null; unread_count: number } }).data;
    },
    onSuccess: (state) => {
      qc.setQueryData<PipelineBoardConversationSummary>(
        pipelineConversationKeys.summary(boardId),
        (existing) => ({
          messages_count: existing?.messages_count ?? 0,
          unread_count: state.unread_count,
          has_unread: state.unread_count > 0,
          pinned_count: existing?.pinned_count ?? 0,
        }),
      );
    },
  });
}

export function usePostBoardMessage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);

  return useMutation({
    mutationFn: async (payload: { body: string; parent_id?: number | null; files?: File[] }) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARD_CONVERSATION_MESSAGES(boardId), {
        body: payload.body,
        parent_id: payload.parent_id ?? null,
      });
      const message = (data as { data: PipelineBoardMessage }).data;
      if (payload.files?.length) {
        const attachments: PipelineBoardMessageAttachment[] = [];
        for (const file of payload.files) {
          const form = new FormData();
          form.append('file', file);
          const upload = await axiosInstance.post(
            PIPELINE.BOARD_CONVERSATION_MESSAGE_ATTACHMENTS(message.id),
            form,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );
          attachments.push((upload.data as { data: PipelineBoardMessageAttachment }).data);
        }
        return { ...message, attachments: [...(message.attachments ?? []), ...attachments] };
      }
      return message;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineConversationKeys.messages(boardId) });
      const previous = qc.getQueryData<PipelineBoardMessage[]>(pipelineConversationKeys.messages(boardId));
      const tempId = nextOptimisticMessageId();
      const optimistic: PipelineBoardMessage = {
        id: tempId,
        board_id: boardId,
        parent_id: payload.parent_id ?? null,
        user_id: user?.id ?? 0,
        body: payload.body,
        created_at: new Date().toISOString(),
        user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
        reactions: { likes: 0, dislikes: 0, user_reaction: null, emoji_counts: {} },
        can_edit: true,
        can_delete: true,
        can_pin: false,
        attachments: [],
      };
      qc.setQueryData<PipelineBoardMessage[]>(
        pipelineConversationKeys.messages(boardId),
        (existing) => [...(existing ?? []), optimistic],
      );
      return { previous, tempId };
    },
    onSuccess: (message, _payload, context) => {
      if (context?.tempId) {
        qc.setQueryData<PipelineBoardMessage[]>(
          pipelineConversationKeys.messages(boardId),
          (existing) => (existing ?? []).map((item) => (item.id === context.tempId ? message : item)),
        );
      }
      void qc.invalidateQueries({ queryKey: pipelineConversationKeys.summary(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineConversationKeys.activity(boardId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (err: AxiosError<{ message?: string }>, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineConversationKeys.messages(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not send message'));
    },
  });
}

export function useUpdateBoardMessage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { id: number; body: string }) => {
      if (!isPersistedMessageId(payload.id)) {
        throw new Error('Message is still sending');
      }
      const { data } = await axiosInstance.patch(PIPELINE.BOARD_CONVERSATION_MESSAGE(payload.id), {
        body: payload.body,
      });
      return (data as { data: PipelineBoardMessage }).data;
    },
    onSuccess: (message) => {
      qc.setQueryData<PipelineBoardMessage[]>(
        pipelineConversationKeys.messages(boardId),
        (existing) => (existing ?? []).map((item) => (item.id === message.id ? message : item)),
      );
      showToast('success', 'Message updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update message'));
    },
  });
}

export function useDeleteBoardMessage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (messageId: number) => {
      if (!isPersistedMessageId(messageId)) {
        throw new Error('Message is still sending');
      }
      await axiosInstance.delete(PIPELINE.BOARD_CONVERSATION_MESSAGE(messageId));
      return messageId;
    },
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: pipelineConversationKeys.messages(boardId) });
      const previous = qc.getQueryData<PipelineBoardMessage[]>(pipelineConversationKeys.messages(boardId));
      qc.setQueryData<PipelineBoardMessage[]>(
        pipelineConversationKeys.messages(boardId),
        (existing) =>
          (existing ?? []).filter((item) => item.id !== messageId && item.parent_id !== messageId),
      );
      return { previous };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineConversationKeys.summary(boardId) });
      showToast('success', 'Message removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineConversationKeys.messages(boardId), context.previous);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete message'));
    },
  });
}

export function useToggleBoardMessageReaction(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { messageId: number; reaction: string | null }) => {
      if (!isPersistedMessageId(payload.messageId)) {
        throw new Error('Message is still sending');
      }
      const { data } = await axiosInstance.post(
        PIPELINE.BOARD_CONVERSATION_MESSAGE_REACTION(payload.messageId),
        { reaction: payload.reaction },
      );
      return {
        messageId: payload.messageId,
        reactions: (data as { data: PipelineActivityReactions }).data,
      };
    },
    onSuccess: ({ messageId, reactions }) => {
      qc.setQueryData<PipelineBoardMessage[]>(
        pipelineConversationKeys.messages(boardId),
        (existing) =>
          (existing ?? []).map((item) =>
            item.id === messageId ? { ...item, reactions } : item,
          ),
      );
    },
  });
}

export function useToggleBoardMessagePin(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (messageId: number) => {
      if (!isPersistedMessageId(messageId)) {
        throw new Error('Message is still sending');
      }
      const { data } = await axiosInstance.post(PIPELINE.BOARD_CONVERSATION_MESSAGE_PIN(messageId));
      return (data as { data: PipelineBoardMessage }).data;
    },
    onSuccess: (message) => {
      qc.setQueryData<PipelineBoardMessage[]>(
        pipelineConversationKeys.messages(boardId),
        (existing) => (existing ?? []).map((item) => {
          if (item.id === message.id) return message;
          if (message.is_pinned && item.is_pinned) {
            return { ...item, is_pinned: false, pinned_at: null, pinned_by: null };
          }
          return item;
        }),
      );
      void qc.invalidateQueries({ queryKey: pipelineConversationKeys.summary(boardId) });
      showToast('success', message.is_pinned ? 'Message pinned' : 'Message unpinned');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update pin'));
    },
  });
}

export function useApplyBoardTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ boardId, templateId }: { boardId: number; templateId: number }) => {
      await axiosInstance.post(PIPELINE.BOARD_APPLY_TEMPLATE(boardId), { template_id: templateId });
      return boardId;
    },
    onSuccess: (boardId) => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.board(boardId) });
      void qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Template applied');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not apply template'));
    },
  });
}
