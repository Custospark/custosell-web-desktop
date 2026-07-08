import type { PipelineVisibility } from '../api/pipelineTypes';
import { Lock, Share2, Users } from 'lucide-react';

export type BoardWorkspace = 'pipeline' | 'estimates';

export const PIPELINE_VISIBILITY_OPTIONS: {
  value: PipelineVisibility;
  label: string;
  hint: string;
  icon: typeof Users;
}[] = [
  { value: 'team', label: 'Team', hint: 'Everyone with Pipeline access', icon: Users },
  { value: 'private', label: 'Private', hint: 'Only you can see this board', icon: Lock },
  { value: 'shared', label: 'Shared', hint: 'Invite specific members', icon: Share2 },
];

export const ESTIMATES_VISIBILITY_OPTIONS: typeof PIPELINE_VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', hint: 'Only you can see this board', icon: Lock },
  { value: 'shared', label: 'Shared', hint: 'Invite viewers, contributors, or managers', icon: Share2 },
  { value: 'team', label: 'Team', hint: 'Everyone with Projects & Estimates access', icon: Users },
];

export function visibilityOptionsForWorkspace(workspace: BoardWorkspace) {
  return workspace === 'estimates' ? ESTIMATES_VISIBILITY_OPTIONS : PIPELINE_VISIBILITY_OPTIONS;
}

export function visibilityOptionLabel(
  value: PipelineVisibility,
  workspace: BoardWorkspace = 'pipeline',
): string {
  return visibilityOptionsForWorkspace(workspace).find((o) => o.value === value)?.label ?? value;
}

/** Explains impact when saving a visibility change in board settings. */
export function visibilityChangeSummary(
  from: PipelineVisibility,
  to: PipelineVisibility,
  workspace: BoardWorkspace = 'pipeline',
): string {
  if (from === to) {
    return `This board is ${visibilityOptionLabel(to, workspace).toLowerCase()} visibility.`;
  }

  const fromLabel = visibilityOptionLabel(from, workspace);
  const toLabel = visibilityOptionLabel(to, workspace);

  if (from === 'shared' && to === 'team') {
    return `Switching from ${fromLabel} to ${toLabel} removes the invite list — everyone with module access can open the board.`;
  }
  if (from === 'shared' && to === 'private') {
    return `Switching from ${fromLabel} to ${toLabel} removes invited members — only the board owner keeps access.`;
  }
  if (from === 'team' && to === 'shared') {
    return `Switching from ${fromLabel} to ${toLabel} limits access to people you invite (viewers, contributors, or managers).`;
  }
  if (from === 'team' && to === 'private') {
    return `Switching from ${fromLabel} to ${toLabel} hides the board from your team — only you keep access.`;
  }
  if (from === 'private' && to === 'team') {
    return `Switching from ${fromLabel} to ${toLabel} opens the board to everyone with module access.`;
  }
  if (from === 'private' && to === 'shared') {
    return `Switching from ${fromLabel} to ${toLabel} lets you invite specific staff with per-person roles.`;
  }

  return `Switching from ${fromLabel} to ${toLabel} when you save.`;
}
