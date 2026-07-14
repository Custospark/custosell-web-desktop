import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { replaceEqualDeep } from '@tanstack/query-core';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  CreateBoardPayload,
  PipelineBoard,
  BoardTeamMember,
} from './pipelineTypes';
import {
  applyBoardAccessFields,
  mergeBoardOnKanban,
} from './pipelineKanbanCache';
import {
  PIPELINE_KANBAN_POLL_MS,
  PIPELINE_BOARD_ACCESS_POLL_MS,
  pipelineKeys,
} from './pipelineQueryKeys';
export {
  pipelineKeys,
  PIPELINE_KANBAN_POLL_MS,
  PIPELINE_BOARD_ACCESS_POLL_MS,
  PIPELINE_LEAD_POLL_MS,
} from './pipelineQueryKeys';
import {
  invalidatePipelineBoardScope,
  invalidatePipelineBoardsList,
  kanbanQueryDefaults,
  listQueryDefaults,
  normalizeItem,
  normalizeList,
  omitSilent,
} from './pipelineQueryUtils';

export function usePipelineBoards(options?: {
  salesOnly?: boolean;
  projectOnly?: boolean;
  estimatesWorkspace?: boolean;
  poll?: boolean;
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
    refetchInterval: options?.poll ? 60_000 : false,
    refetchIntervalInBackground: Boolean(options?.poll),
    ...listQueryDefaults,
  });
}

export type BoardTeamMemberScope = 'workspace' | 'business';

export function useBoardTeamMembers(
  workspace: 'pipeline' | 'estimates' = 'pipeline',
  options?: { enabled?: boolean; scope?: BoardTeamMemberScope },
) {
  const scope = options?.scope ?? 'workspace';
  return useQuery<BoardTeamMember[]>({
    queryKey: pipelineKeys.teamMembers(workspace, scope),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `${PIPELINE.TEAM_MEMBERS}?workspace=${workspace}&scope=${scope}`,
      );
      return normalizeList<BoardTeamMember>(data);
    },
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled ?? true,
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
    refetchInterval: options?.poll === false || !boardId ? false : PIPELINE_KANBAN_POLL_MS,
    refetchIntervalInBackground: true,
    placeholderData: (previousData) => previousData,
    structuralSharing: (oldData, newData) => {
      if (!oldData || !newData) return newData;
      const merged = replaceEqualDeep(oldData, newData) as PipelineBoard;
      return applyBoardAccessFields(merged, newData);
    },
    ...kanbanQueryDefaults,
  });
}

/**
 * Polls the lightweight board endpoint and merges visibility/role/permission fields
 * into the kanban cache so the top-bar badge and action gates update promptly.
 */
export function useBoardAccessSync(boardId: number, enabled = true) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: pipelineKeys.boardAccess(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PIPELINE.BOARD(boardId));
      const fresh = normalizeItem<PipelineBoard>(data);
      qc.setQueryData<PipelineBoard>(pipelineKeys.kanban(boardId), (old) =>
        old ? applyBoardAccessFields(old, fresh) : old,
      );
      return {
        visibility: fresh.visibility,
        members: fresh.members,
        current_member_role: fresh.current_member_role,
        can_contribute: fresh.can_contribute,
        can_manage_settings: fresh.can_manage_settings,
        updated_at: fresh.updated_at,
      };
    },
    enabled: enabled && boardId > 0,
    refetchInterval: enabled && boardId > 0 ? PIPELINE_BOARD_ACCESS_POLL_MS : false,
    refetchIntervalInBackground: true,
    staleTime: PIPELINE_BOARD_ACCESS_POLL_MS / 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

export function useDeletePipelineBoard() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PIPELINE.BOARD(id));
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: pipelineKeys.kanban(id) });
      qc.removeQueries({ queryKey: pipelineKeys.board(id) });
      qc.removeQueries({ queryKey: pipelineKeys.boardAccess(id) });
      invalidatePipelineBoardsList(qc);
      showToast('success', 'Board deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete board'));
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
      members?: { user_id: number; role: 'viewer' | 'contributor' | 'manager' }[];
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
      qc.invalidateQueries({ queryKey: pipelineKeys.boardAccess(board.id) });
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

