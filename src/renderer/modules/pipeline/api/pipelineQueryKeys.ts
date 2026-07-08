export const pipelineKeys = {
  all: ['pipeline'] as const,
  boards: () => [...pipelineKeys.all, 'boards'] as const,
  board: (id: number) => [...pipelineKeys.all, 'board', id] as const,
  kanban: (id: number) => [...pipelineKeys.all, 'kanban', id] as const,
  leads: (filters?: Record<string, string>) => [...pipelineKeys.all, 'leads', filters] as const,
  lead: (id: number) => [...pipelineKeys.all, 'lead', id] as const,
  sources: () => [...pipelineKeys.all, 'sources'] as const,
  insights: (boardId?: number) => [...pipelineKeys.all, 'insights', boardId ?? 'all'] as const,
  calendar: (boardId: number, year: number, month: number, dateField?: string) =>
    [...pipelineKeys.all, 'calendar', boardId, year, month, dateField ?? 'due'] as const,
  labels: (boardId?: number) => [...pipelineKeys.all, 'labels', boardId ?? 'all'] as const,
  teamMembers: (workspace: 'pipeline' | 'estimates') =>
    [...pipelineKeys.all, 'team-members', workspace] as const,
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

export const pipelineTemplateKeys = {
  list: (workspace: 'pipeline' | 'estimates') => [...pipelineKeys.all, 'board-templates', workspace] as const,
};

export const PIPELINE_KANBAN_POLL_MS = 45_000;
export const PIPELINE_LEAD_POLL_MS = 30_000;
