import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { USER_COMMENT_TYPES } from './pipelineActivityMeta';

export interface CommentThread {
  root: PipelineLeadActivity;
  replies: PipelineLeadActivity[];
}

const MAX_VISIBLE_REPLIES_DEFAULT = 5;

/** Group flat user activities into root comments + replies (single nesting level). */
export function buildCommentThreads(activities: PipelineLeadActivity[]): CommentThread[] {
  const userComments = activities.filter((a) => USER_COMMENT_TYPES.has(a.type));
  const roots = userComments
    .filter((a) => !a.parent_id)
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  const repliesByParent = new Map<number, PipelineLeadActivity[]>();
  for (const activity of userComments) {
    if (!activity.parent_id) continue;
    const list = repliesByParent.get(activity.parent_id) ?? [];
    list.push(activity);
    repliesByParent.set(activity.parent_id, list);
  }

  for (const list of repliesByParent.values()) {
    list.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  }

  return roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));
}

export function countUserComments(activities: PipelineLeadActivity[]): number {
  return activities.filter((a) => USER_COMMENT_TYPES.has(a.type)).length;
}

export function visibleReplies(
  replies: PipelineLeadActivity[],
  expanded: boolean,
  maxVisible = MAX_VISIBLE_REPLIES_DEFAULT,
): { shown: PipelineLeadActivity[]; hiddenCount: number } {
  if (expanded || replies.length <= maxVisible) {
    return { shown: replies, hiddenCount: 0 };
  }
  return {
    shown: replies.slice(0, maxVisible),
    hiddenCount: replies.length - maxVisible,
  };
}

export { MAX_VISIBLE_REPLIES_DEFAULT };
