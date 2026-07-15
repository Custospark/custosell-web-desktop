import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  PipelineAttachment,
  PipelineBoard,
  PipelineChecklist,
  PipelineChecklistItem,
  CreateChecklistPayload,
  CreateChecklistItemPayload,
  PipelineLead,
  PipelineLeadActivity,
} from './pipelineTypes';
import { updateLeadOnKanban, mergeBoardOnKanban } from './pipelineKanbanCache';
import { pipelineKeys } from './pipelineQueryKeys';
import {
  applyLeadChecklistsOptimistic,
  buildOptimisticSystemEntry,
  computeChecklistCounts,
  mergeServerChecklist,
  mergeServerChecklistItem,
  nextOptimisticId,
  patchLeadFieldsOptimistic,
  replaceChecklistInLead,
  replaceChecklistItemInLead,
} from './pipelineOptimisticCache';
import {
  normalizeItem,
} from './pipelineQueryUtils';

export function useCreatePipelineChecklist(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateChecklistPayload = {}) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_CHECKLISTS(leadId), {
        title: payload.title || 'Checklist',
        description: payload.description ?? null,
      });
      return normalizeItem<PipelineChecklist>(data);
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const label = payload.title?.trim() || 'Checklist';
      const tempId = nextOptimisticId();
      const optimisticChecklist: PipelineChecklist = {
        id: tempId,
        lead_id: leadId,
        title: label,
        description: payload.description ?? null,
        sort_order: (previousLead?.checklists?.length ?? 0) + 1,
        items: [],
      };
      const checklists = [...(previousLead?.checklists ?? []), optimisticChecklist];
      applyLeadChecklistsOptimistic(
        qc,
        leadId,
        boardId,
        checklists,
        buildOptimisticSystemEntry(leadId, `Checklist added: ${label}`, { action: 'checklist_added', title: label }),
      );
      return { previousLead, tempId };
    },
    onSuccess: (serverChecklist, _vars, context) => {
      qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
        if (!existing || context?.tempId == null) return existing;
        const checklists = mergeServerChecklist(existing.checklists ?? [], context.tempId, serverChecklist);
        return { ...existing, checklists, ...computeChecklistCounts(checklists) };
      });
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
        if (!lead) return old;
        return updateLeadOnKanban(old as PipelineBoard, leadId, {
          checklist_total: lead.checklist_total,
          checklist_done: lead.checklist_done,
        });
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
    },
  });
}

export function useUpdatePipelineChecklist(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PipelineChecklist> & { id: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.CHECKLIST(id), payload);
      return normalizeItem<PipelineChecklist>(data);
    },
    onMutate: async ({ id, ...payload }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const checklists = (previousLead?.checklists ?? []).map((checklist) =>
        checklist.id === id ? { ...checklist, ...payload } : checklist,
      );
      applyLeadChecklistsOptimistic(qc, leadId, boardId, checklists);
      return { previousLead };
    },
    onSuccess: (serverChecklist) => {
      qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
        if (!existing) return existing;
        const checklists = replaceChecklistInLead(existing.checklists ?? [], serverChecklist.id, {
          ...serverChecklist,
          items: serverChecklist.items ?? existing.checklists?.find((c) => c.id === serverChecklist.id)?.items ?? [],
        });
        return { ...existing, checklists, ...computeChecklistCounts(checklists) };
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
    },
  });
}

export function useDeletePipelineChecklist(leadId: number, boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (checklistId: number) => {
      await axiosInstance.delete(PIPELINE.CHECKLIST(checklistId));
      return checklistId;
    },
    onMutate: async (checklistId) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const removed = previousLead?.checklists?.find((checklist) => checklist.id === checklistId);
      const checklists = (previousLead?.checklists ?? []).filter((checklist) => checklist.id !== checklistId);
      applyLeadChecklistsOptimistic(
        qc,
        leadId,
        boardId,
        checklists,
        removed
          ? buildOptimisticSystemEntry(leadId, `Checklist removed: ${removed.title}`, {
              action: 'checklist_removed',
              title: removed.title,
            })
          : undefined,
      );
      return { previousLead };
    },
    onSuccess: () => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
        if (!lead) return old;
        return updateLeadOnKanban(old as PipelineBoard, leadId, {
          checklist_total: lead.checklist_total,
          checklist_done: lead.checklist_done,
        });
      });
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      showToast('error', sanitizeErrorMessage(err, 'Could not delete checklist'));
    },
  });
}

export function useCreateChecklistItem(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistId, title, description }: CreateChecklistItemPayload) => {
      const { data } = await axiosInstance.post(PIPELINE.CHECKLIST_ITEMS(checklistId), {
        title,
        description: description ?? null,
      });
      return normalizeItem<PipelineChecklistItem>(data);
    },
    onMutate: async ({ checklistId, title, description }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const tempId = nextOptimisticId();
      const checklist = previousLead?.checklists?.find((entry) => entry.id === checklistId);
      const optimisticItem: PipelineChecklistItem = {
        id: tempId,
        checklist_id: checklistId,
        title,
        description: description ?? null,
        is_done: false,
        sort_order: (checklist?.items?.length ?? 0) + 1,
      };
      const checklists = (previousLead?.checklists ?? []).map((entry) =>
        entry.id === checklistId
          ? { ...entry, items: [...(entry.items ?? []), optimisticItem] }
          : entry,
      );
      applyLeadChecklistsOptimistic(
        qc,
        leadId,
        boardId,
        checklists,
        buildOptimisticSystemEntry(leadId, `Checklist item added: ${title}`, { action: 'checklist_item_added', title }),
      );
      return { previousLead, tempId };
    },
    onSuccess: (serverItem, _vars, context) => {
      qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
        if (!existing || context?.tempId == null) return existing;
        const checklists = mergeServerChecklistItem(existing.checklists ?? [], context.tempId, serverItem);
        return { ...existing, checklists, ...computeChecklistCounts(checklists) };
      });
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
        if (!lead) return old;
        return updateLeadOnKanban(old as PipelineBoard, leadId, {
          checklist_total: lead.checklist_total,
          checklist_done: lead.checklist_done,
        });
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
    },
  });
}

export function useUpdateChecklistItem(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PipelineChecklistItem> & { id: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.CHECKLIST_ITEM(id), payload);
      return normalizeItem<PipelineChecklistItem>(data);
    },
    onMutate: async ({ id, is_done, title, description }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const item = previousLead?.checklists?.flatMap((checklist) => checklist.items ?? []).find((entry) => entry.id === id);
      let historyEntry: PipelineLeadActivity | undefined;
      const patch: Partial<PipelineChecklistItem> = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (typeof is_done === 'boolean') patch.is_done = is_done;

      const checklists = replaceChecklistItemInLead(
        previousLead?.checklists ?? [],
        id,
        { ...(item ?? { id, checklist_id: 0, title: title ?? '', description: description ?? null, sort_order: 0, is_done: false }), ...patch },
      );

      if (typeof is_done === 'boolean' && item && item.is_done !== is_done) {
        const itemTitle = title ?? item.title ?? 'Item';
        historyEntry = buildOptimisticSystemEntry(
          leadId,
          is_done ? `Checklist item completed: ${itemTitle}` : `Checklist item reopened: ${itemTitle}`,
          { action: is_done ? 'checklist_item_done' : 'checklist_item_reopened', title: itemTitle },
        );
      }

      applyLeadChecklistsOptimistic(qc, leadId, boardId, checklists, historyEntry);
      return { previousLead };
    },
    onSuccess: (serverItem) => {
      qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
        if (!existing) return existing;
        const checklists = replaceChecklistItemInLead(existing.checklists ?? [], serverItem.id, serverItem);
        return { ...existing, checklists, ...computeChecklistCounts(checklists) };
      });
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
        if (!lead) return old;
        return updateLeadOnKanban(old as PipelineBoard, leadId, {
          checklist_total: lead.checklist_total,
          checklist_done: lead.checklist_done,
        });
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
    },
  });
}

export function useDeleteChecklistItem(leadId: number, boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (itemId: number) => {
      await axiosInstance.delete(PIPELINE.CHECKLIST_ITEM(itemId));
      return itemId;
    },
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const removed = previousLead?.checklists
        ?.flatMap((checklist) => checklist.items ?? [])
        .find((item) => item.id === itemId);
      const checklists = (previousLead?.checklists ?? []).map((checklist) => ({
        ...checklist,
        items: (checklist.items ?? []).filter((item) => item.id !== itemId),
      }));
      applyLeadChecklistsOptimistic(
        qc,
        leadId,
        boardId,
        checklists,
        removed
          ? buildOptimisticSystemEntry(leadId, `Checklist item removed: ${removed.title}`, {
              action: 'checklist_item_removed',
              title: removed.title,
            })
          : undefined,
      );
      return { previousLead };
    },
    onSuccess: () => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
        if (!lead) return old;
        return updateLeadOnKanban(old as PipelineBoard, leadId, {
          checklist_total: lead.checklist_total,
          checklist_done: lead.checklist_done,
        });
      });
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      showToast('error', sanitizeErrorMessage(err, 'Could not delete checklist item'));
    },
  });
}

export function useUploadPipelineAttachment(leadId: number, boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosInstance.post(PIPELINE.LEAD_ATTACHMENTS(leadId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return normalizeItem<PipelineAttachment>(data);
    },
    onMutate: async (file) => {
      const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      patchLeadFieldsOptimistic(
        qc,
        leadId,
        boardId,
        { attachments_count: (lead?.attachments_count ?? 0) + 1 },
        buildOptimisticSystemEntry(leadId, `Attachment added: ${file.name}`, {
          action: 'attachment_added',
          file_name: file.name,
        }),
      );
      return { previousLead: lead };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      showToast('success', 'Attachment uploaded');
    },
    onError: (err: AxiosError<{ message?: string }>, _file, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      showToast('error', sanitizeErrorMessage(err, 'Could not upload file'));
    },
  });
}

export function useDeletePipelineAttachment(leadId: number, boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.ATTACHMENT(id));
    },
    onMutate: async (id) => {
      const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const attachment = lead?.attachments?.find((a) => a.id === id);
      const fileName = attachment?.file_name ?? 'Attachment';
      patchLeadFieldsOptimistic(
        qc,
        leadId,
        boardId,
        { attachments_count: Math.max(0, (lead?.attachments_count ?? 1) - 1) },
        buildOptimisticSystemEntry(leadId, `Attachment removed: ${fileName}`, {
          action: 'attachment_removed',
          file_name: fileName,
        }),
      );
      return { previousLead: lead };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      showToast('success', 'Attachment removed');
    },
    onError: (err: AxiosError<{ message?: string }>, _id, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      showToast('error', sanitizeErrorMessage(err, 'Could not remove attachment'));
    },
  });
}

export function useCreatePipelineAttachmentLink(leadId: number, boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ url, title }: { url: string; title?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_ATTACHMENT_LINK(leadId), { url, title });
      return normalizeItem<PipelineAttachment>(data);
    },
    onMutate: async () => {
      const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      patchLeadFieldsOptimistic(
        qc,
        leadId,
        boardId,
        { attachments_count: (lead?.attachments_count ?? 0) + 1 },
        undefined,
      );
      return { previousLead: lead };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      showToast('success', 'Link added');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) qc.setQueryData(pipelineKeys.lead(leadId), context.previousLead);
      showToast('error', sanitizeErrorMessage(err, 'Could not add link'));
    },
  });
}

export function useUploadBoardBackground() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ boardId, file }: { boardId: number; file: File }) => {
      const form = new FormData();
      form.append('background', file);
      const { data } = await axiosInstance.post(PIPELINE.BOARD_BACKGROUND(boardId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { background_type: string; background_value: string; url: string };
    },
    onMutate: async ({ boardId }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      return { previousKanban, boardId };
    },
    onSuccess: (result, { boardId }) => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        return mergeBoardOnKanban(old as PipelineBoard, {
          background_type: result.background_type,
          background_value: result.background_value,
        });
      });
      qc.setQueryData(pipelineKeys.board(boardId), (old) =>
        old
          ? {
              ...(old as PipelineBoard),
              background_type: result.background_type,
              background_value: result.background_value,
            }
          : old,
      );
      showToast('success', 'Background updated');
    },
    onError: (err, { boardId }, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not upload background'));
    },
  });
}

