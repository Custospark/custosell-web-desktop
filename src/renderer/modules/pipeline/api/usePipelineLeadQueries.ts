import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  CreateLeadPayload,
  PipelineBoard,
  PipelineLabel,
  PipelineLead,
  PipelineUserRef,
  UpdateLeadPayload,
} from './pipelineTypes';
import {
  addLeadToKanban,
  moveLeadOptimistic,
  removeLeadFromKanban,
  updateLeadOnKanban,
} from './pipelineKanbanCache';
import { pipelineItemLabel } from './pipelineCardTerms';
import {
  PIPELINE_LEAD_POLL_MS,
  pipelineKeys,
} from './pipelineQueryKeys';
import {
  appendLeadActivitiesOptimistic,
  applyLeadMutationToCache,
  buildOptimisticHistoryForUpdate,
  buildOptimisticStageChange,
  buildOptimisticStatusChange,
  buildOptimisticSystemEntry,
  findKanbanLead,
} from './pipelineOptimisticCache';
import {
  leadDetailQueryDefaults,
  listQueryDefaults,
  normalizeItem,
  normalizeList,
  omitLeadMeta,
} from './pipelineQueryUtils';

/** Resolve assignee user refs from the board roster so optimistic UI updates instantly. */
function resolveOptimisticAssignees(
  board: PipelineBoard,
  assigneeIds: number[],
): PipelineUserRef[] {
  const assignees: PipelineUserRef[] = [];
  const roster = board.members ?? [];
  const allKnown = roster
    .map((m) => m.user)
    .filter((u): u is PipelineUserRef => u != null);
  if (board.creator && assigneeIds.includes(board.creator.id)) {
    assignees.push(board.creator);
  }
  for (const user of allKnown) {
    if (assigneeIds.includes(user.id) && !assignees.some((a) => a.id === user.id)) {
      assignees.push(user);
    }
  }
  for (const id of assigneeIds) {
    if (!assignees.some((a) => a.id === id)) {
      assignees.push({ id, name: `User #${id}` });
    }
  }
  return assignees;
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
    refetchIntervalInBackground: true,
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

      const cachedLabels = qc.getQueryData<PipelineLabel[]>(pipelineKeys.labels(boardId));
      const labelMap = new Map((cachedLabels ?? []).map((l) => [l.id, l]));
      const optimisticLabels = (payload.label_ids ?? [])
        .map((id) => labelMap.get(id))
        .filter((l): l is PipelineLabel => l != null);

      const optimisticAssignees = payload.assignee_ids?.length && previousKanban
        ? resolveOptimisticAssignees(previousKanban, payload.assignee_ids)
        : [];

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
        assignees: optimisticAssignees.length ? optimisticAssignees : undefined,
        source_id: payload.source_id ?? null,
        estimated_value: payload.estimated_value ?? null,
        currency: payload.currency ?? 'UGX',
        expected_close_date: payload.expected_close_date ?? null,
        due_date: payload.due_date ?? null,
        start_date: payload.start_date ?? null,
        priority: payload.priority ?? null,
        labels: optimisticLabels.length ? optimisticLabels : undefined,
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

      const optimisticPatch: UpdateLeadPayload = { ...payload };
      if (payload.assignee_ids && previousKanban) {
        optimisticPatch.assignees = resolveOptimisticAssignees(previousKanban, payload.assignee_ids);
        optimisticPatch.assigned_to = payload.assigned_to ?? payload.assignee_ids[0] ?? null;
      }

      if (previousLead) {
        qc.setQueryData(pipelineKeys.lead(id), { ...previousLead, ...optimisticPatch });
        const historyEntries = buildOptimisticHistoryForUpdate(previousLead, optimisticPatch);
        if (historyEntries.length > 0) {
          appendLeadActivitiesOptimistic(qc, id, boardId, historyEntries);
        }
      }
      if (previousKanban) {
        qc.setQueryData(pipelineKeys.kanban(boardId), updateLeadOnKanban(previousKanban, id, optimisticPatch));
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


