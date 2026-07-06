import { Kanban, Lock, Share2, Users } from 'lucide-react';
import type { PipelineVisibility } from '../api/pipelineTypes';

export const PIPELINE_VISIBILITY_META: Record<
  PipelineVisibility,
  { label: string; icon: typeof Users; className: string }
> = {
  team: { label: 'Team', icon: Users, className: 'bg-blue-50 text-blue-700' },
  private: { label: 'Private', icon: Lock, className: 'bg-gray-100 text-gray-700' },
  shared: { label: 'Shared', icon: Share2, className: 'bg-violet-50 text-violet-700' },
};

export { Kanban as PipelineBoardIcon };
