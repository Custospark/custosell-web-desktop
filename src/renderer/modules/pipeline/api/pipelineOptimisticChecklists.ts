import type { QueryClient } from '@tanstack/react-query';
import type {
  PipelineChecklist,
  PipelineChecklistItem,
  PipelineLeadActivity,
} from './pipelineTypes';
import { patchLeadFieldsOptimistic } from './pipelineOptimisticLead';

export function computeChecklistCounts(checklists: PipelineChecklist[] | undefined): {
  checklist_total: number;
  checklist_done: number;
} {
  const items = (checklists ?? []).flatMap((checklist) => checklist.items ?? []);
  return {
    checklist_total: items.length,
    checklist_done: items.filter((item) => item.is_done).length,
  };
}

export function applyLeadChecklistsOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number,
  checklists: PipelineChecklist[],
  historyEntry?: PipelineLeadActivity,
): void {
  patchLeadFieldsOptimistic(
    qc,
    leadId,
    boardId,
    { checklists, ...computeChecklistCounts(checklists) },
    historyEntry,
  );
}

export function replaceChecklistInLead(
  checklists: PipelineChecklist[],
  checklistId: number,
  next: PipelineChecklist,
): PipelineChecklist[] {
  return checklists.map((checklist) => (checklist.id === checklistId ? next : checklist));
}

export function replaceChecklistItemInLead(
  checklists: PipelineChecklist[],
  itemId: number,
  next: PipelineChecklistItem,
): PipelineChecklist[] {
  return checklists.map((checklist) => ({
    ...checklist,
    items: (checklist.items ?? []).map((item) => (item.id === itemId ? next : item)),
  }));
}

export function mergeServerChecklist(
  checklists: PipelineChecklist[],
  tempId: number,
  serverChecklist: PipelineChecklist,
): PipelineChecklist[] {
  return checklists.map((checklist) =>
    checklist.id === tempId
      ? { ...serverChecklist, items: checklist.items ?? serverChecklist.items ?? [] }
      : checklist,
  );
}

export function mergeServerChecklistItem(
  checklists: PipelineChecklist[],
  tempId: number,
  serverItem: PipelineChecklistItem,
): PipelineChecklist[] {
  return checklists.map((checklist) => ({
    ...checklist,
    items: (checklist.items ?? []).map((item) =>
      item.id === tempId ? serverItem : item,
    ),
  }));
}
