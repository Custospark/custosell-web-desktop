export const pipelineKeys = {
  all: ['pipeline'] as const,
  boards: () => [...pipelineKeys.all, 'boards'] as const,
  board: (id: number) => [...pipelineKeys.all, 'board', id] as const,
  boardAccess: (id: number) => [...pipelineKeys.all, 'board-access', id] as const,
  kanban: (id: number) => [...pipelineKeys.all, 'kanban', id] as const,
  leads: (filters?: Record<string, string>) => [...pipelineKeys.all, 'leads', filters] as const,
  lead: (id: number) => [...pipelineKeys.all, 'lead', id] as const,
  sources: () => [...pipelineKeys.all, 'sources'] as const,
  insights: (boardId?: number) => [...pipelineKeys.all, 'insights', boardId ?? 'all'] as const,
  calendar: (boardId: number, year: number, month: number, dateField?: string) =>
    [...pipelineKeys.all, 'calendar', boardId, year, month, dateField ?? 'due'] as const,
  labels: (boardId?: number) => [...pipelineKeys.all, 'labels', boardId ?? 'all'] as const,
  teamMembers: (
    workspace: 'pipeline' | 'estimates',
    scope: 'workspace' | 'business' = 'workspace',
  ) => [...pipelineKeys.all, 'team-members', workspace, scope] as const,
};

export const pipelineCollaborationKeys = {
  summary: (boardId: number) => [...pipelineKeys.all, 'collaboration-summary', boardId] as const,
  announcements: (boardId: number) => [...pipelineKeys.all, 'announcements', boardId] as const,
  polls: (boardId: number, leadId?: number) =>
    [...pipelineKeys.all, 'polls', boardId, leadId ?? 'board'] as const,
  reminders: (leadId: number) => [...pipelineKeys.all, 'reminders', leadId] as const,
};

export const pipelineResourceKeys = {
  summary: (boardId: number) => [...pipelineKeys.all, 'resources-summary', boardId] as const,
  list: (boardId: number) => [...pipelineKeys.all, 'resources', boardId] as const,
  members: (boardId: number) => [...pipelineKeys.all, 'resource-members', boardId] as const,
};

export const pipelineConversationKeys = {
  summary: (boardId: number) => [...pipelineKeys.all, 'conversation-summary', boardId] as const,
  messages: (boardId: number) => [...pipelineKeys.all, 'conversation-messages', boardId] as const,
  activity: (boardId: number) => [...pipelineKeys.all, 'conversation-activity', boardId] as const,
  automations: (boardId: number) => [...pipelineKeys.all, 'board-automations', boardId] as const,
};

export const pipelineProgressKeys = {
  summary: (boardId: number, period: string, from?: string, to?: string, stageIds?: string) =>
    [...pipelineKeys.all, 'progress-summary', boardId, period, from ?? '', to ?? '', stageIds ?? ''] as const,
  summaryBoard: (boardId: number) => [...pipelineKeys.all, 'progress-summary', boardId] as const,
  targets: (boardId: number) => [...pipelineKeys.all, 'board-targets', boardId] as const,
  config: (boardId: number) => [...pipelineKeys.all, 'progress-config', boardId] as const,
};

export const PIPELINE_PROGRESS_POLL_MS = 30_000;

export const pipelineTemplateKeys = {
  list: (workspace: 'pipeline' | 'estimates') => [...pipelineKeys.all, 'board-templates', workspace] as const,
};

/** Poll open kanban boards every 30s so card/column moves sync across teammates. */
export const PIPELINE_KANBAN_POLL_MS = 30_000;
export const PIPELINE_KANBAN_VIEWER_POLL_MS = 30_000;
/** Lighter board GET for visibility/role/permission changes (merged into kanban cache). */
export const PIPELINE_BOARD_ACCESS_POLL_MS = 30_000;
export const PIPELINE_LEAD_POLL_MS = 30_000;
