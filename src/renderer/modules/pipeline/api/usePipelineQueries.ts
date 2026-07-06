import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  CreateBoardPayload,
  CreateLeadPayload,
  PipelineBoard,
  PipelineCalendarDay,
  PipelineChecklist,
  PipelineChecklistItem,
  PipelineAttachment,
  PipelineInsightsSummary,
  PipelineLabel,
  PipelineLead,
  PipelineLeadActivity,
  PipelineSource,
  PipelineStage,
  UpdateLeadPayload,
} from './pipelineTypes';
import { moveLeadOptimistic, replaceLeadOnKanban } from './pipelineKanbanCache';
import { pipelineItemLabel } from './pipelineCardTerms';

export const pipelineKeys = {
  all: ['pipeline'] as const,
  boards: () => [...pipelineKeys.all, 'boards'] as const,
  board: (id: number) => [...pipelineKeys.all, 'board', id] as const,
  kanban: (id: number) => [...pipelineKeys.all, 'kanban', id] as const,
  leads: (filters?: Record<string, string>) => [...pipelineKeys.all, 'leads', filters] as const,
  lead: (id: number) => [...pipelineKeys.all, 'lead', id] as const,
  sources: () => [...pipelineKeys.all, 'sources'] as const,
  insights: (boardId?: number) => [...pipelineKeys.all, 'insights', boardId ?? 'all'] as const,
  calendar: (boardId: number, year: number, month: number) =>
    [...pipelineKeys.all, 'calendar', boardId, year, month] as const,
  labels: (boardId?: number) => [...pipelineKeys.all, 'labels', boardId ?? 'all'] as const,
};

const queryDefaults = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

function normalizeItem<T>(payload: unknown): T {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') return obj.data as T;
    return payload as T;
  }
  throw new Error('Invalid API response');
}

function invalidatePipeline(qc: ReturnType<typeof useQueryClient>, boardId?: number): void {
  qc.invalidateQueries({ queryKey: pipelineKeys.boards() });
  qc.invalidateQueries({ queryKey: pipelineKeys.leads() });
  qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
  if (boardId) {
    qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    qc.invalidateQueries({ queryKey: pipelineKeys.board(boardId) });
    qc.invalidateQueries({ queryKey: [...pipelineKeys.all, 'calendar'] });
  }
}

export function usePipelineBoards() {
  return useQuery<PipelineBoard[]>({
    queryKey: pipelineKeys.boards(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARDS);
      return normalizeList<PipelineBoard>(data);
    },
    placeholderData: (previousData) => previousData,
    ...queryDefaults,
  });
}

export function usePipelineBoard(id: number) {
  return useQuery<PipelineBoard>({
    queryKey: pipelineKeys.board(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD(id));
      return normalizeItem<PipelineBoard>(data);
    },
    enabled: Boolean(id),
    ...queryDefaults,
  });
}

export function usePipelineKanban(boardId: number) {
  return useQuery<PipelineBoard>({
    queryKey: pipelineKeys.kanban(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_KANBAN(boardId));
      return normalizeItem<PipelineBoard>(data);
    },
    enabled: Boolean(boardId),
    ...queryDefaults,
  });
}

export function useCreatePipelineBoard() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateBoardPayload) => {
      const { data } = await axiosInstance.post(PIPELINE.BOARDS, payload);
      return normalizeItem<PipelineBoard>(data);
    },
    onSuccess: (board) => {
      qc.setQueryData(pipelineKeys.kanban(board.id), (old) =>
        old ? { ...(old as PipelineBoard), cover_color: board.cover_color, name: board.name } : old,
      );
      invalidatePipeline(qc, board.id);
      showToast('success', 'Pipeline board created');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create board'));
    },
  });
}

export function useUpdatePipelineBoard() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<CreateBoardPayload> & { id: number; is_archived?: boolean; members?: { user_id: number; role: 'editor' | 'viewer' }[] }) => {
      const { data } = await axiosInstance.patch(PIPELINE.BOARD(id), payload);
      return normalizeItem<PipelineBoard>(data);
    },
    onSuccess: (board) => {
      qc.setQueryData(pipelineKeys.kanban(board.id), (old) => {
        if (!old) return old;
        return { ...(old as PipelineBoard), ...board, stages: (old as PipelineBoard).stages };
      });
      invalidatePipeline(qc, board.id);
      showToast('success', 'Board updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update board'));
    },
  });
}

export function usePipelineLeads(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<PipelineLead[]>({
    queryKey: pipelineKeys.leads(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.LEADS}${params ? `?${params}` : ''}`);
      return normalizeList<PipelineLead>(data);
    },
    placeholderData: (prev) => prev ?? [],
    ...queryDefaults,
  });
}

export function usePipelineLead(id: number, enabled = true) {
  return useQuery<PipelineLead>({
    queryKey: pipelineKeys.lead(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.LEAD(id));
      return normalizeItem<PipelineLead>(data);
    },
    enabled: Boolean(id) && enabled,
    ...queryDefaults,
  });
}

export function useCreatePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateLeadPayload) => {
      const { data } = await axiosInstance.post(PIPELINE.LEADS, payload);
      return normalizeItem<PipelineLead>(data);
    },
    onSuccess: (lead) => {
      invalidatePipeline(qc, lead.board_id);
      showToast('success', `${pipelineItemLabel(lead.card_type)} created`);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create card'));
    },
  });
}

export function useUpdatePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateLeadPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.LEAD(id), payload);
      return normalizeItem<PipelineLead>(data);
    },
    onSuccess: (lead) => {
      qc.setQueryData(pipelineKeys.lead(lead.id), lead);
      invalidatePipeline(qc, lead.board_id);
      showToast('success', `${pipelineItemLabel(lead.card_type)} updated`);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not save changes'));
    },
  });
}

export function useMovePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      stage_id,
      position,
    }: {
      id: number;
      stage_id: number;
      position: number;
      board_id: number;
      card_type?: PipelineLead['card_type'];
    }) => {
      const { data } = await axiosInstance.patch(PIPELINE.LEAD_STAGE(id), { stage_id, position });
      return normalizeItem<PipelineLead>(data);
    },
    onMutate: async ({ id, stage_id, position, board_id }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(board_id) });
      const previous = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(board_id));
      if (previous) {
        qc.setQueryData(
          pipelineKeys.kanban(board_id),
          moveLeadOptimistic(previous, id, stage_id, position),
        );
      }
      return { previous, board_id };
    },
    onSuccess: (lead, { board_id }) => {
      qc.setQueryData(pipelineKeys.lead(lead.id), lead);
      qc.setQueryData(pipelineKeys.kanban(board_id), (old) =>
        old ? replaceLeadOnKanban(old as PipelineBoard, lead) : old,
      );
      qc.invalidateQueries({ queryKey: pipelineKeys.leads() });
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
    },
    onError: (err, vars, context) => {
      if (context?.previous && context.board_id) {
        qc.setQueryData(pipelineKeys.kanban(context.board_id), context.previous);
      }
      const noun = pipelineItemLabel(vars.card_type).toLowerCase();
      showToast('error', sanitizeErrorMessage(err, `Could not move ${noun}`));
    },
  });
}

export function useConvertPipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, customer_id }: { id: number; customer_id?: number }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_CONVERT(id), customer_id ? { customer_id } : {});
      return normalizeItem<PipelineLead>(data);
    },
    onSuccess: (lead) => {
      invalidatePipeline(qc, lead.board_id);
      showToast('success', 'Lead converted to customer');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not convert lead'));
    },
  });
}

export function useAddPipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, type, body }: { leadId: number; type: string; body: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_ACTIVITIES(leadId), { type, body });
      return normalizeItem<PipelineLeadActivity>(data);
    },
    onSuccess: (_activity, vars) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(vars.leadId) });
      showToast('success', 'Activity added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add activity'));
    },
  });
}

export function usePipelineSources() {
  return useQuery<PipelineSource[]>({
    queryKey: pipelineKeys.sources(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.SOURCES);
      return normalizeList<PipelineSource>(data);
    },
    ...queryDefaults,
  });
}

export function usePipelineInsights(boardId?: number) {
  const params = boardId ? `?board_id=${boardId}` : '';
  return useQuery<PipelineInsightsSummary>({
    queryKey: pipelineKeys.insights(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.INSIGHTS}${params}`);
      return normalizeItem<PipelineInsightsSummary>(data);
    },
    ...queryDefaults,
  });
}

export function useUpdatePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ stageId, ...payload }: Partial<PipelineStage> & { stageId: number }) => {
      const { data } = await axiosInstance.patch(PIPELINE.STAGE(stageId), payload);
      return normalizeItem<PipelineStage>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Stage updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update stage'));
    },
  });
}

export function useCreatePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.STAGES(boardId), payload);
      return normalizeItem<PipelineStage>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Column added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add column'));
    },
  });
}

export function useDeletePipelineStage(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ stageId, migrate_to_stage_id }: { stageId: number; migrate_to_stage_id?: number }) => {
      await axiosInstance.delete(PIPELINE.STAGE(stageId), {
        data: migrate_to_stage_id ? { migrate_to_stage_id } : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Column deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete column'));
    },
  });
}

export function useReorderPipelineStages(boardId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (stageIds: number[]) => {
      const { data } = await axiosInstance.post(PIPELINE.STAGES_REORDER(boardId), { stage_ids: stageIds });
      return normalizeList<PipelineStage>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    },
  });
}

export function useDeletePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: number; board_id: number; card_type?: PipelineLead['card_type'] }) => {
      await axiosInstance.delete(PIPELINE.LEAD(id));
    },
    onSuccess: (_data, vars) => {
      invalidatePipeline(qc, vars.board_id);
      showToast('success', `${pipelineItemLabel(vars.card_type)} archived`);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not archive'));
    },
  });
}

export function usePipelineCalendar(boardId: number, year: number, month: number) {
  return useQuery<PipelineCalendarDay[]>({
    queryKey: pipelineKeys.calendar(boardId, year, month),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${PIPELINE.BOARD_CALENDAR(boardId)}?year=${year}&month=${month}`,
      );
      return normalizeList<PipelineCalendarDay>(data);
    },
    enabled: Boolean(boardId),
    ...queryDefaults,
  });
}

export function useCreatePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.SOURCES, payload);
      return normalizeItem<PipelineSource>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source added');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not add source'));
    },
  });
}

export function useUpdatePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string }) => {
      const { data } = await axiosInstance.patch(PIPELINE.SOURCE(id), payload);
      return normalizeItem<PipelineSource>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update source'));
    },
  });
}

export function useDeletePipelineSource() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.SOURCE(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.sources() });
      showToast('success', 'Source deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete source'));
    },
  });
}

export function usePipelineLabels(boardId?: number) {
  const params = boardId ? `?board_id=${boardId}` : '';
  return useQuery<PipelineLabel[]>({
    queryKey: pipelineKeys.labels(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.LABELS}${params}`);
      return normalizeList<PipelineLabel>(data);
    },
    enabled: boardId !== undefined,
    ...queryDefaults,
  });
}

export function useCreatePipelineLabel(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.LABELS, { ...payload, board_id: boardId });
      return normalizeItem<PipelineLabel>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.labels(boardId) });
      showToast('success', 'Label created');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not create label'));
    },
  });
}

export function useDeletePipelineLabel(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.LABEL(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.labels(boardId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Label deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete label'));
    },
  });
}

export function useCreatePipelineChecklist(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_CHECKLISTS(leadId), { title: title || 'Checklist' });
      return normalizeItem<PipelineChecklist>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    },
  });
}

export function useCreateChecklistItem(leadId: number, boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistId, title }: { checklistId: number; title: string }) => {
      const { data } = await axiosInstance.post(PIPELINE.CHECKLIST_ITEMS(checklistId), { title });
      return normalizeItem<PipelineChecklistItem>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Attachment uploaded');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
      showToast('success', 'Attachment removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove attachment'));
    },
  });
}
