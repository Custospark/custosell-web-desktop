// Barrel re-export for optimistic cache helpers. Split into focused modules to
// keep each file under the 500-line Vera limit - imports here stay unchanged.
export {
  applyLeadMutationToCache,
  findKanbanLead,
  getOptimisticActor,
  makeActivity,
  nextOptimisticId,
  normalizeValue,
  toKanbanLeadSnapshot,
} from './pipelineOptimisticCore';
export {
  buildOptimisticComment,
  buildOptimisticHistoryForUpdate,
  buildOptimisticReactionEntry,
  buildOptimisticStageChange,
  buildOptimisticStatusChange,
  buildOptimisticSystemEntry,
} from './pipelineOptimisticHistory';
export {
  appendLeadActivitiesOptimistic,
  patchActivityReactionOptimistic,
  patchLeadActivityOptimistic,
  patchLeadFieldsOptimistic,
  removeCommentWithHistoryOptimistic,
  removeLeadActivityOptimistic,
  replaceOptimisticActivity,
} from './pipelineOptimisticLead';
export {
  applyLeadChecklistsOptimistic,
  computeChecklistCounts,
  mergeServerChecklist,
  mergeServerChecklistItem,
  replaceChecklistInLead,
  replaceChecklistItemInLead,
} from './pipelineOptimisticChecklists';
export {
  applyPollToCache,
  patchAnnouncementOptimistic,
  patchCollaborationSummary,
  prependAnnouncementOptimistic,
  prependPollOptimistic,
  prependReminderOptimistic,
  removeAnnouncementOptimistic,
  removePollOptimistic,
  removeReminderOptimistic,
} from './pipelineOptimisticCollaboration';
