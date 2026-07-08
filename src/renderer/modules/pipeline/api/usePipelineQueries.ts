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
  PipelineCalendarDateField,
  PipelineChecklist,
  PipelineChecklistItem,
  CreateChecklistPayload,
  CreateChecklistItemPayload,
  PipelineAttachment,
  PipelineInsightsSummary,
  PipelineLabel,
  PipelineLead,
  PipelineLeadActivity,
  PipelineSource,
  PipelineStage,
  BoardTeamMember,
  UpdateLeadPayload,
} from './pipelineTypes';
import {
  addLeadToKanban,
  addStageToKanban,
  mergeBoardOnKanban,
  moveLeadOptimistic,
  removeLeadFromKanban,
  removeStageFromKanban,
  reorderStagesOnKanban,
  updateLeadOnKanban,
  updateStageOnKanban,
} from './pipelineKanbanCache';
import { pipelineItemLabel } from './pipelineCardTerms';
import {
  PIPELINE_KANBAN_POLL_MS,
  PIPELINE_LEAD_POLL_MS,
  pipelineKeys,
} from './pipelineQueryKeys';
export { pipelineKeys, PIPELINE_KANBAN_POLL_MS, PIPELINE_LEAD_POLL_MS } from './pipelineQueryKeys';
import {
  appendLeadActivitiesOptimistic,
  applyLeadMutationToCache,
  buildOptimisticComment,
  buildOptimisticHistoryForUpdate,
  buildOptimisticStageChange,
  buildOptimisticStatusChange,
  buildOptimisticSystemEntry,
  applyLeadChecklistsOptimistic,
  computeChecklistCounts,
  findKanbanLead,
  mergeServerChecklist,
  mergeServerChecklistItem,
  nextOptimisticId,
  patchLeadFieldsOptimistic,
  removeCommentWithHistoryOptimistic,
  patchLeadActivityOptimistic,
  replaceChecklistInLead,
  replaceChecklistItemInLead,
  replaceOptimisticActivity,
} from './pipelineOptimisticCache';

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

function omitSilent<T extends { silent?: boolean }>(vars: T): Omit<T, 'silent'> {
  const { silent: _omit, ...rest } = vars;
  void _omit;
  return rest;
}

function omitLeadMeta<T extends { silent?: boolean; board_id?: number }>(
  vars: T,
): Omit<T, 'silent' | 'board_id'> {
  const { silent: _s, board_id: _b, ...rest } = vars;
  void _s;
  void _b;
  return rest;
}

const listQueryDefaults = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

const kanbanQueryDefaults = {
  staleTime: PIPELINE_KANBAN_POLL_MS,
  gcTime: 10 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

const leadDetailQueryDefaults = {
  staleTime: 15_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
};

function invalidatePipelineBoardsList(qc: ReturnType<typeof useQueryClient>): void {
  qc.invalidateQueries({ queryKey: pipelineKeys.boards() });
}

function invalidatePipelineBoardScope(
  qc: ReturnType<typeof useQueryClient>,
  boardId?: number,
): void {
  if (boardId) {
    qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    qc.invalidateQueries({ queryKey: pipelineKeys.board(boardId) });
    qc.invalidateQueries({ queryKey: [...pipelineKeys.all, 'calendar'] });
  }
  qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
}

export function usePipelineBoards(options?: {
  salesOnly?: boolean;
  projectOnly?: boolean;
  estimatesWorkspace?: boolean;
}) {
  const projectOnly = options?.projectOnly ?? false;
  const estimatesWorkspace = options?.estimatesWorkspace ?? false;
  const salesOnly = projectOnly || estimatesWorkspace
    ? false
    : (options?.salesOnly ?? true);
  const scopeKey = estimatesWorkspace
    ? 'estimates'
    : projectOnly
      ? 'project'
      : salesOnly
        ? 'sales'
        : 'all';
  return useQuery<PipelineBoard[]>({
    queryKey: [...pipelineKeys.boards(), scopeKey],
    queryFn: async () => {
      const params = estimatesWorkspace
        ? '?estimates_workspace=1'
        : projectOnly
          ? '?project_only=1'
          : salesOnly
            ? '?sales_only=1'
            : '?sales_only=0';
      const { data } = await axiosInstance.get(`${PIPELINE.BOARDS}${params}`);
      return normalizeList<PipelineBoard>(data);
    },
    placeholderData: (previousData) => previousData,
    ...listQueryDefaults,
  });
}

export function useBoardTeamMembers(workspace: 'pipeline' | 'estimates' = 'pipeline') {
  return useQuery<BoardTeamMember[]>({
    queryKey: pipelineKeys.teamMembers(workspace),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PIPELINE.TEAM_MEMBERS}?workspace=${workspace}`);
      return normalizeList<BoardTeamMember>(data);
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    ...listQueryDefaults,
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
    ...listQueryDefaults,
  });
}

export function usePipelineKanban(boardId: number, options?: { poll?: boolean }) {
  return useQuery<PipelineBoard>({
    queryKey: pipelineKeys.kanban(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_KANBAN(boardId));
      return normalizeItem<PipelineBoard>(data);
    },
    enabled: Boolean(boardId),
    refetchInterval: options?.poll !== false && boardId ? PIPELINE_KANBAN_POLL_MS : false,
    refetchIntervalInBackground: false,
    placeholderData: (previousData) => previousData,
    ...kanbanQueryDefaults,
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
      invalidatePipelineBoardsList(qc);
      invalidatePipelineBoardScope(qc, board.id);
      showToast(
        'success',
        board.workspace === 'estimates' && !board.project_id
          ? 'Personal board created'
          : 'Pipeline board created',
      );
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
    mutationFn: async (input: Partial<CreateBoardPayload> & {
      id: number;
      is_archived?: boolean;
      members?: { user_id: number; role: 'editor' | 'viewer' }[];
      silent?: boolean;
    }) => {
      const { id, ...payload } = omitSilent(input);
      const { data } = await axiosInstance.patch(PIPELINE.BOARD(id), payload);
      return normalizeItem<PipelineBoard>(data);
    },
    onMutate: async (input) => {
      const { id, ...payload } = omitSilent(input);
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(id) });
      await qc.cancelQueries({ queryKey: pipelineKeys.boards() });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(id));
      const previousBoards = qc.getQueryData<PipelineBoard[]>(pipelineKeys.boards());
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(id), mergeBoardOnKanban(previousKanban, payload as Partial<PipelineBoard>));
      }
      if (previousBoards) {
        qc.setQueryData(
          pipelineKeys.boards(),
          previousBoards.map((b) => (b.id === id ? { ...b, ...payload } : b)),
        );
      }
      return { previousKanban, previousBoards, boardId: id };
    },
    onSuccess: (board, vars) => {
      qc.setQueryData<PipelineBoard>(pipelineKeys.kanban(board.id), (old) => {
        if (!old) return board;
        return mergeBoardOnKanban(old, board);
      });
      qc.setQueryData(pipelineKeys.boards(), (old) =>
        (old as PipelineBoard[] | undefined)?.map((b) => (b.id === board.id ? { ...b, ...board } : b)),
      );
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
      if (!vars.silent) showToast('success', 'Board updated');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban && context.boardId) {
        qc.setQueryData(pipelineKeys.kanban(context.boardId), context.previousKanban);
      }
      if (context?.previousBoards) {
        qc.setQueryData(pipelineKeys.boards(), context.previousBoards);
      }
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
    ...listQueryDefaults,
  });
}

export function usePipelineLead(
  id: number,
  enabled = true,
  options?: { poll?: boolean; initialData?: PipelineLead },
) {
  return useQuery<PipelineLead>({
    queryKey: pipelineKeys.lead(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.LEAD(id));
      return normalizeItem<PipelineLead>(data);
    },
    enabled: Boolean(id) && enabled,
    initialData: options?.initialData,
    refetchInterval: options?.poll && enabled && id ? PIPELINE_LEAD_POLL_MS : false,
    refetchIntervalInBackground: false,
    ...leadDetailQueryDefaults,
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
    onMutate: async (payload) => {
      const boardId = payload.board_id;
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      const tempId = -Date.now();
      const stage = previousKanban?.stages?.find((s) => s.id === payload.stage_id);
      const optimisticLead: PipelineLead = {
        id: tempId,
        business_id: previousKanban?.business_id ?? 0,
        board_id: boardId,
        stage_id: payload.stage_id,
        title: payload.title,
        card_type: payload.card_type ?? 'lead',
        description: payload.description ?? null,
        contact_name: payload.contact_name ?? null,
        contact_email: payload.contact_email ?? null,
        contact_phone: payload.contact_phone ?? null,
        customer_id: payload.customer_id ?? null,
        converted_customer_id: null,
        assigned_to: payload.assigned_to ?? null,
        source_id: payload.source_id ?? null,
        estimated_value: payload.estimated_value ?? null,
        currency: payload.currency ?? 'UGX',
        expected_close_date: payload.expected_close_date ?? null,
        due_date: payload.due_date ?? null,
        start_date: payload.start_date ?? null,
        priority: payload.priority ?? null,
        background_color: null,
        status: 'open',
        position: (stage?.leads?.length ?? 0) + 1,
        won_at: null,
        lost_at: null,
        converted_at: null,
        lost_reason: null,
        stage: stage
          ? {
              id: stage.id,
              name: stage.name,
              color: stage.color,
              is_won: stage.is_won,
              is_lost: stage.is_lost,
            }
          : undefined,
      };
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), addLeadToKanban(previousKanban, optimisticLead));
      }
      return { previousKanban, boardId, tempId };
    },
    onSuccess: (lead, _vars, context) => {
      if (context?.tempId) {
        qc.setQueryData(pipelineKeys.kanban(lead.board_id), (old) =>
          old ? removeLeadFromKanban(old as PipelineBoard, context.tempId) : old,
        );
      }
      applyLeadMutationToCache(qc, lead, lead.board_id);
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
      showToast('success', `${pipelineItemLabel(lead.card_type)} created`);
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban && context.boardId) {
        qc.setQueryData(pipelineKeys.kanban(context.boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not create card'));
    },
  });
}

export function useUpdatePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateLeadPayload & { id: number; board_id?: number; silent?: boolean }) => {
      const { id, ...payload } = omitLeadMeta(input);
      const { data } = await axiosInstance.patch(PIPELINE.LEAD(id), payload);
      return normalizeItem<PipelineLead>(data);
    },
    onMutate: async (input) => {
      const { id, board_id, ...payload } = input;
      const existing = qc.getQueryData<PipelineLead>(pipelineKeys.lead(id));
      const boardId = board_id ?? existing?.board_id;
      if (!boardId) return {};

      await qc.cancelQueries({ queryKey: pipelineKeys.lead(id) });
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });

      const previousLead = existing;
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));

      if (previousLead) {
        qc.setQueryData(pipelineKeys.lead(id), { ...previousLead, ...payload });
        const historyEntries = buildOptimisticHistoryForUpdate(previousLead, payload);
        if (historyEntries.length > 0) {
          appendLeadActivitiesOptimistic(qc, id, boardId, historyEntries);
        }
      }
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), updateLeadOnKanban(previousKanban, id, payload));
      }
      return { previousLead, previousKanban, boardId, leadId: id };
    },
    onSuccess: (lead) => {
      applyLeadMutationToCache(qc, lead, lead.board_id);
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
    },
    onError: (err, _vars, context) => {
      if (context?.previousLead && context.leadId) {
        qc.setQueryData(pipelineKeys.lead(context.leadId), context.previousLead);
      }
      if (context?.previousKanban && context.boardId) {
        qc.setQueryData(pipelineKeys.kanban(context.boardId), context.previousKanban);
      }
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
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(id) });
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(board_id) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(id));
      const previous = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(board_id));
      if (previous) {
        const fromLead = previousLead ?? findKanbanLead(previous, id);
        const fromStageName = fromLead?.stage?.name ?? 'Previous stage';
        const toStage = previous.stages?.find((stage) => stage.id === stage_id);
        qc.setQueryData(
          pipelineKeys.kanban(board_id),
          moveLeadOptimistic(previous, id, stage_id, position),
        );
        if (fromLead && toStage && fromLead.stage_id !== stage_id) {
          const activities = [
            buildOptimisticStageChange(fromLead, fromStageName, toStage.name),
          ];
          let nextStatus = fromLead.status ?? 'open';
          if (toStage.is_won) nextStatus = 'won';
          else if (toStage.is_lost) nextStatus = 'lost';
          else if (nextStatus !== 'converted') nextStatus = 'open';
          const statusEntry = buildOptimisticStatusChange(fromLead, fromLead.status ?? 'open', nextStatus);
          if (statusEntry) activities.push(statusEntry);
          appendLeadActivitiesOptimistic(qc, id, board_id, activities);
        }
        const updatedLead = findKanbanLead(
          qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(board_id)),
          id,
        );
        if (previousLead && updatedLead) {
          qc.setQueryData(pipelineKeys.lead(id), { ...previousLead, ...updatedLead });
        }
      }
      return { previous, previousLead, board_id };
    },
    onSuccess: (lead, { board_id }) => {
      applyLeadMutationToCache(qc, lead, board_id);
      qc.invalidateQueries({ queryKey: pipelineKeys.leads() });
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
    },
    onError: (err, vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(vars.id), context.previousLead);
      }
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
    mutationFn: async ({ id, customer_id }: { id: number; customer_id?: number; board_id?: number }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_CONVERT(id), customer_id ? { customer_id } : {});
      return normalizeItem<PipelineLead>(data);
    },
    onMutate: async ({ id, board_id }) => {
      const existing = qc.getQueryData<PipelineLead>(pipelineKeys.lead(id));
      const boardId = board_id ?? existing?.board_id;
      if (!boardId) return {};

      await qc.cancelQueries({ queryKey: pipelineKeys.lead(id) });
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });

      const previousLead = existing;
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      const partial = { status: 'converted' as const };

      if (previousLead) qc.setQueryData(pipelineKeys.lead(id), { ...previousLead, ...partial });
      if (previousKanban) qc.setQueryData(pipelineKeys.kanban(boardId), updateLeadOnKanban(previousKanban, id, partial));
      appendLeadActivitiesOptimistic(qc, id, boardId, [
        buildOptimisticSystemEntry(id, 'Lead converted to customer'),
      ]);

      return { previousLead, previousKanban, boardId, leadId: id };
    },
    onSuccess: (lead) => {
      applyLeadMutationToCache(qc, lead, lead.board_id);
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
      showToast('success', 'Lead converted to customer');
    },
    onError: (err, _vars, context) => {
      if (context?.previousLead && context.leadId) {
        qc.setQueryData(pipelineKeys.lead(context.leadId), context.previousLead);
      }
      if (context?.previousKanban && context.boardId) {
        qc.setQueryData(pipelineKeys.kanban(context.boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not convert lead'));
    },
  });
}

export function useAddPipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      leadId,
      type,
      body,
      parentId,
    }: {
      leadId: number;
      type: string;
      body: string;
      boardId?: number;
      parentId?: number | null;
    }) => {
      const { data } = await axiosInstance.post(PIPELINE.LEAD_ACTIVITIES(leadId), {
        type,
        body,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      return normalizeItem<PipelineLeadActivity>(data);
    },
    onMutate: async ({
      leadId,
      type,
      body,
      parentId,
      boardId,
    }: {
      leadId: number;
      type: string;
      body: string;
      boardId?: number;
      parentId?: number | null;
    }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      const tempId = nextOptimisticId();
      const optimistic = {
        ...buildOptimisticComment(
          leadId,
          type as PipelineLeadActivity['type'],
          body,
          parentId,
        ),
        id: tempId,
      };
      appendLeadActivitiesOptimistic(qc, leadId, boardId, [optimistic]);
      return { previousLead, tempId, boardId };
    },
    onSuccess: (activity, vars, context) => {
      if (context?.tempId) {
        replaceOptimisticActivity(qc, vars.leadId, context.tempId, activity);
      } else {
        applyLeadMutationToCache(qc, {
          ...(qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId)) ?? { id: vars.leadId } as PipelineLead),
          activities: [
            ...(qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId))?.activities ?? []),
            activity,
          ],
        }, vars.boardId);
      }
      if (vars.boardId) {
        qc.setQueryData(pipelineKeys.kanban(vars.boardId), (old) => {
          if (!old) return old;
          const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId));
          if (!lead) return old;
          return updateLeadOnKanban(old as PipelineBoard, vars.leadId, {
            comments_count: lead.comments_count,
          });
        });
      }
      showToast('success', vars.parentId ? 'Reply posted' : vars.type === 'comment' ? 'Comment posted' : 'Activity added');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(_vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not add activity'));
    },
  });
}

export function useDeletePipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      activityId,
    }: {
      activityId: number;
      leadId: number;
      boardId?: number;
    }) => {
      await axiosInstance.delete(PIPELINE.ACTIVITY(activityId));
    },
    onMutate: async ({
      activityId,
      leadId,
      boardId,
    }: {
      activityId: number;
      leadId: number;
      boardId?: number;
    }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      removeCommentWithHistoryOptimistic(qc, leadId, boardId, activityId);
      return { previousLead, boardId };
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(vars.leadId) });
      if (vars.boardId) {
        const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(vars.leadId));
        if (lead) {
          qc.setQueryData(pipelineKeys.kanban(vars.boardId), (old) =>
            old
              ? updateLeadOnKanban(old as PipelineBoard, vars.leadId, {
                  comments_count: lead.comments_count,
                  history_count: lead.history_count,
                })
              : old,
          );
        }
      }
      showToast('success', 'Comment deleted');
    },
    onError: (err, vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete comment'));
    },
  });
}

export function useUpdatePipelineActivity() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      activityId,
      body,
    }: {
      activityId: number;
      body: string;
      leadId: number;
      boardId?: number;
    }) => {
      const { data } = await axiosInstance.patch(PIPELINE.ACTIVITY(activityId), { body });
      return normalizeItem<PipelineLeadActivity>(data);
    },
    onMutate: async ({ activityId, body, leadId, boardId }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(leadId) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      patchLeadActivityOptimistic(qc, leadId, activityId, { body });
      appendLeadActivitiesOptimistic(qc, leadId, boardId, [
        buildOptimisticSystemEntry(leadId, 'Comment edited', {
          action: 'comment_edited',
          preview: body.slice(0, 120),
        }),
      ], { bumpComments: false });
      return { previousLead };
    },
    onSuccess: (activity, vars) => {
      patchLeadActivityOptimistic(qc, vars.leadId, activity.id, activity);
      void qc.invalidateQueries({ queryKey: pipelineKeys.lead(vars.leadId) });
      showToast('success', 'Comment updated');
    },
    onError: (err: AxiosError<{ message?: string }>, _vars, context) => {
      if (context?.previousLead) {
        qc.setQueryData(pipelineKeys.lead(_vars.leadId), context.previousLead);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not update comment'));
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
    ...listQueryDefaults,
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
    ...listQueryDefaults,
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
    onMutate: async ({ stageId, ...payload }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), updateStageOnKanban(previousKanban, stageId, payload));
      }
      return { previousKanban, boardId };
    },
    onSuccess: (stage) => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) =>
        old ? updateStageOnKanban(old as PipelineBoard, stage.id, stage) : old,
      );
      showToast('success', 'Stage updated');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      const tempId = -Date.now();
      const optimisticStage: PipelineStage = {
        id: tempId,
        board_id: boardId,
        name: payload.name,
        sort_order: previousKanban?.stages?.length ?? 0,
        color: payload.color ?? '#64748b',
        is_won: false,
        is_lost: false,
        rotting_days: null,
        leads: [],
      };
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), addStageToKanban(previousKanban, optimisticStage));
      }
      return { previousKanban, boardId, tempId };
    },
    onSuccess: (stage, _vars, context) => {
      qc.setQueryData<PipelineBoard>(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const withoutTemp = (old.stages ?? []).filter((s) => s.id !== context?.tempId);
        return addStageToKanban({ ...old, stages: withoutTemp }, stage);
      });
      showToast('success', 'Column added');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
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
      return stageId;
    },
    onMutate: async ({ stageId }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), removeStageFromKanban(previousKanban, stageId));
      }
      return { previousKanban, boardId };
    },
    onSuccess: () => {
      showToast('success', 'Column deleted');
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not delete column'));
    },
  });
}

export function useReorderPipelineStages(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (stageIds: number[]) => {
      const { data } = await axiosInstance.post(PIPELINE.STAGES_REORDER(boardId), { stage_ids: stageIds });
      return normalizeList<PipelineStage>(data);
    },
    onMutate: async (stageIds) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(boardId) });
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(boardId));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), reorderStagesOnKanban(previousKanban, stageIds));
      }
      return { previousKanban, boardId };
    },
    onSuccess: (stages) => {
      qc.setQueryData(pipelineKeys.kanban(boardId), (old) => {
        if (!old) return old;
        const stageIds = stages.map((s) => s.id);
        return reorderStagesOnKanban(old as PipelineBoard, stageIds);
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not reorder columns'));
    },
  });
}

export function useDeletePipelineLead() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: number; board_id: number; card_type?: PipelineLead['card_type'] }) => {
      await axiosInstance.delete(PIPELINE.LEAD(id));
      return id;
    },
    onMutate: async ({ id, board_id }) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.lead(id) });
      await qc.cancelQueries({ queryKey: pipelineKeys.kanban(board_id) });
      const previousLead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(id));
      const previousKanban = qc.getQueryData<PipelineBoard>(pipelineKeys.kanban(board_id));
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(board_id), removeLeadFromKanban(previousKanban, id));
      }
      return { previousLead, previousKanban, boardId: board_id, leadId: id };
    },
    onSuccess: (_id, vars) => {
      qc.removeQueries({ queryKey: pipelineKeys.lead(vars.id) });
      qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
      showToast('success', `${pipelineItemLabel(vars.card_type)} archived`);
    },
    onError: (err, _vars, context) => {
      if (context?.previousLead && context.leadId) {
        qc.setQueryData(pipelineKeys.lead(context.leadId), context.previousLead);
      }
      if (context?.previousKanban && context.boardId) {
        qc.setQueryData(pipelineKeys.kanban(context.boardId), context.previousKanban);
      }
      showToast('error', sanitizeErrorMessage(err, 'Could not archive'));
    },
  });
}

export function usePipelineCalendar(
  boardId: number,
  year: number,
  month: number,
  dateField: PipelineCalendarDateField = 'due',
) {
  return useQuery<PipelineCalendarDay[]>({
    queryKey: pipelineKeys.calendar(boardId, year, month, dateField),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${PIPELINE.BOARD_CALENDAR(boardId)}?year=${year}&month=${month}&date_field=${dateField}`,
      );
      return normalizeList<PipelineCalendarDay>(data);
    },
    enabled: Boolean(boardId),
    ...listQueryDefaults,
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
    enabled: Boolean(boardId),
    ...listQueryDefaults,
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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: pipelineKeys.labels(boardId) });
      const previous = qc.getQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId));
      const tempId = -Date.now();
      const optimistic: PipelineLabel = {
        id: tempId,
        business_id: 0,
        board_id: boardId,
        name: payload.name,
        color: payload.color ?? '#6366f1',
        sort_order: previous?.length ?? 0,
      };
      qc.setQueryData(pipelineKeys.labels(boardId), [...(previous ?? []), optimistic]);
      return { previous, tempId };
    },
    onSuccess: (label, _vars, context) => {
      qc.setQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId), (old) => {
        if (!old) return [label];
        const withoutTemp = old.filter((l) => l.id !== context?.tempId);
        return [...withoutTemp, label];
      });
      showToast('success', 'Label created');
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(pipelineKeys.labels(boardId), context.previous);
      }
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
