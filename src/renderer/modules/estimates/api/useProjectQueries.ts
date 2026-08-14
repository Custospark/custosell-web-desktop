import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { PROJECTS } from '../../../shared/api/endpoints/endpoints';
import type {
  CreateCostAllocationPayload,
  CreateProjectPayload,
  CreateProjectTaskPayload,
  CreateTimesheetEntryPayload,
  Project,
  ProjectBudgetSummary,
  ProjectCostAllocation,
  ProjectMember,
  ProjectMemberRole,
  ProjectProfitability,
  ProjectTask,
  TimesheetEntry,
  UpdateProjectPayload,
} from './projectTypes';
import type { PipelineBoard } from '../../pipeline/api/pipelineTypes';

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters?: Record<string, string>) => [...projectKeys.all, 'list', filters] as const,
  detail: (id: number) => [...projectKeys.all, 'detail', id] as const,
  budget: (id: number) => [...projectKeys.all, 'budget', id] as const,
  profitability: (id: number) => [...projectKeys.all, 'profitability', id] as const,
};

const queryDefaults = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') return obj.data as T;
    return obj as T;
  }
  throw new Error('Invalid response');
}

export function useProjects(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<Project[]>({
    queryKey: projectKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${PROJECTS.BASE}${params ? `?${params}` : ''}`);
      return unwrapList<Project>(data);
    },
    ...queryDefaults,
  });
}

/** Client/billable projects only - excludes personal internal projects from expense allocation. */
export function useBillableProjects() {
  return useProjects({ billable_only: '1' });
}

export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.BY_ID(id));
      return unwrapEntity<Project>(data);
    },
    enabled: Boolean(id),
    ...queryDefaults,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Project, AxiosError, CreateProjectPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PROJECTS.BASE, payload);
      return unwrapEntity<Project>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
      showToast('success', 'Project created');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to create project')),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Project, AxiosError, { id: number; payload: UpdateProjectPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.put(PROJECTS.BY_ID(id), payload);
      return unwrapEntity<Project>(data);
    },
    onSuccess: (project) => {
      qc.setQueryData(projectKeys.detail(project.id), project);
      void qc.invalidateQueries({ queryKey: projectKeys.all });
      showToast('success', 'Project updated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to update project')),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => { await axiosInstance.delete(PROJECTS.BY_ID(id)); },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
      showToast('success', 'Project deleted');
    },
    onError: () => showToast('error', 'Failed to delete project'),
  });
}

export function useCreateProjectTask(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ProjectTask, AxiosError, CreateProjectTaskPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PROJECTS.TASKS(projectId), payload);
      return unwrapEntity<ProjectTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      showToast('success', 'Task added');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to add task')),
  });
}

export function useUpdateProjectTask(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ProjectTask, AxiosError, { taskId: number; payload: Partial<CreateProjectTaskPayload> }>({
    mutationFn: async ({ taskId, payload }) => {
      const { data } = await axiosInstance.put(PROJECTS.TASK(projectId, taskId), payload);
      return unwrapEntity<ProjectTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      showToast('success', 'Task updated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to update task')),
  });
}

export function useDeleteProjectTask(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (taskId) => { await axiosInstance.delete(PROJECTS.TASK(projectId, taskId)); },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      showToast('success', 'Task deleted');
    },
    onError: () => showToast('error', 'Failed to delete task'),
  });
}

export function useCreateTimesheetEntry(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<TimesheetEntry, AxiosError, CreateTimesheetEntryPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PROJECTS.TIMESHEETS(projectId), payload);
      return unwrapEntity<TimesheetEntry>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.budget(projectId) });
      showToast('success', 'Timesheet entry logged');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to log timesheet')),
  });
}

export function useDeleteTimesheetEntry(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (entryId) => { await axiosInstance.delete(PROJECTS.TIMESHEET(projectId, entryId)); },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.budget(projectId) });
      showToast('success', 'Timesheet entry removed');
    },
    onError: () => showToast('error', 'Failed to remove timesheet entry'),
  });
}

export function useCreateCostAllocation(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ProjectCostAllocation, AxiosError, CreateCostAllocationPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PROJECTS.ALLOCATIONS(projectId), payload);
      return unwrapEntity<ProjectCostAllocation>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.budget(projectId) });
      showToast('success', 'Cost allocation added');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to add allocation')),
  });
}

export function useDeleteCostAllocation(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (allocationId) => {
      await axiosInstance.delete(PROJECTS.ALLOCATION(projectId, allocationId));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.budget(projectId) });
      showToast('success', 'Allocation removed');
    },
    onError: () => showToast('error', 'Failed to remove allocation'),
  });
}

export function useProjectBudgetSummary(projectId: number, enabled = true) {
  return useQuery<ProjectBudgetSummary>({
    queryKey: projectKeys.budget(projectId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.BUDGET_SUMMARY(projectId));
      return unwrapEntity<ProjectBudgetSummary>(data);
    },
    enabled: Boolean(projectId) && enabled,
    ...queryDefaults,
  });
}

export function useProjectProfitability(projectId: number, enabled = true) {
  return useQuery<ProjectProfitability>({
    queryKey: projectKeys.profitability(projectId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.PROFITABILITY(projectId));
      return unwrapEntity<ProjectProfitability>(data);
    },
    enabled: Boolean(projectId) && enabled,
    ...queryDefaults,
  });
}

export function useProjectBoard(projectId: number) {
  return useQuery<PipelineBoard>({
    queryKey: [...projectKeys.all, 'board', projectId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.BOARD(projectId));
      return unwrapEntity<PipelineBoard>(data);
    },
    enabled: Boolean(projectId),
    ...queryDefaults,
  });
}

export function useProjectBoardKanban(projectId: number) {
  return useQuery<PipelineBoard>({
    queryKey: [...projectKeys.all, 'board-kanban', projectId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.BOARD_KANBAN(projectId));
      return unwrapEntity<PipelineBoard>(data);
    },
    enabled: Boolean(projectId),
    ...queryDefaults,
  });
}

export function useMyProjects() {
  return useQuery<Project[]>({
    queryKey: [...projectKeys.all, 'my'] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.MY);
      return unwrapList<Project>(data);
    },
    ...queryDefaults,
  });
}

export function useProjectMembers(projectId: number) {
  return useQuery<ProjectMember[]>({
    queryKey: [...projectKeys.all, 'members', projectId] as const,
    queryFn: async () => {
      const { data } = await axiosInstance.get(PROJECTS.MEMBERS(projectId));
      return unwrapList<ProjectMember>(data);
    },
    enabled: Boolean(projectId),
    ...queryDefaults,
  });
}

export function useAddProjectMember(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (payload: { user_id: number; role: ProjectMemberRole; send_notification?: boolean }) => {
      const { data } = await axiosInstance.post(PROJECTS.MEMBERS(projectId), payload);
      return unwrapEntity<ProjectMember>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...projectKeys.all, 'members', projectId] });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      showToast('success', 'Team member invited');
    },
    onError: (e: AxiosError) => showToast('error', sanitizeErrorMessage(e, 'Failed to invite member')),
  });
}

export function useUpdateProjectMember(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: ProjectMemberRole }) => {
      const { data } = await axiosInstance.patch(PROJECTS.MEMBER(projectId, userId), { role });
      return unwrapEntity<ProjectMember>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...projectKeys.all, 'members', projectId] });
      showToast('success', 'Member role updated');
    },
    onError: (e: AxiosError) => showToast('error', sanitizeErrorMessage(e, 'Failed to update member')),
  });
}

export function useRemoveProjectMember(projectId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async (userId: number) => {
      await axiosInstance.delete(PROJECTS.MEMBER(projectId, userId));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...projectKeys.all, 'members', projectId] });
      showToast('success', 'Member removed');
    },
    onError: (e: AxiosError) => showToast('error', sanitizeErrorMessage(e, 'Failed to remove member')),
  });
}
