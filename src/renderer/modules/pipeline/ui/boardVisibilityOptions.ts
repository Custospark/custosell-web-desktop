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
