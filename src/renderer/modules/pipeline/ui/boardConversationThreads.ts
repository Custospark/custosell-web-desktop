import type { PipelineBoardMessage } from '../api/pipelineTypes';

export interface BoardMessageThread {
  root: PipelineBoardMessage;
  replies: PipelineBoardMessage[];
}

const MAX_VISIBLE_REPLIES_DEFAULT = 5;

export function buildBoardMessageThreads(messages: PipelineBoardMessage[]): BoardMessageThread[] {
  const roots = messages
    .filter((message) => !message.parent_id)
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  const repliesByParent = new Map<number, PipelineBoardMessage[]>();
  for (const message of messages) {
    if (!message.parent_id) continue;
    const list = repliesByParent.get(message.parent_id) ?? [];
    list.push(message);
    repliesByParent.set(message.parent_id, list);
  }

  for (const list of repliesByParent.values()) {
    list.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  }

  return roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));
}

export function countBoardMessages(messages: PipelineBoardMessage[]): number {
  return messages.length;
}

export function visibleReplies(
  replies: PipelineBoardMessage[],
  expanded: boolean,
  maxVisible = MAX_VISIBLE_REPLIES_DEFAULT,
): { shown: PipelineBoardMessage[]; hiddenCount: number } {
  if (expanded || replies.length <= maxVisible) {
    return { shown: replies, hiddenCount: 0 };
  }
  return {
    shown: replies.slice(0, maxVisible),
    hiddenCount: replies.length - maxVisible,
  };
}

export { MAX_VISIBLE_REPLIES_DEFAULT };
