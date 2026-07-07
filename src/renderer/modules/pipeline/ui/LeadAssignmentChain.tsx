import { ArrowRight } from 'lucide-react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import type { PipelineUserRef } from '../api/pipelineTypes';

interface LeadAssignmentChainProps {
  creator?: PipelineUserRef | null;
  assignee: PipelineUserRef;
}

/** Visual link from card creator to current assignee. */
export default function LeadAssignmentChain({ creator, assignee }: LeadAssignmentChainProps) {
  const showCreator = creator && creator.id !== assignee.id;

  if (!showCreator) {
    return (
      <UserIdentityChip
        name={assignee.name}
        avatar={assignee.avatar}
        size="xs"
        className="max-w-[120px] rounded-full bg-gray-50 py-0.5 pl-0.5 pr-2 ring-1 ring-gray-100"
        title={assignee.name}
      />
    );
  }

  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-blue-50 py-0.5 pl-0.5 pr-2 ring-1 ring-gray-100"
      title={`${creator.name} assigned to ${assignee.name}`}
    >
      <UserAvatar name={creator.name} avatar={creator.avatar} size="xs" title={creator.name} />
      <span className="flex min-w-[20px] flex-1 items-center gap-0.5 px-0.5">
        <span className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-400 to-blue-400" />
        <ArrowRight className="h-3 w-3 shrink-0 text-blue-500" aria-hidden />
        <span className="h-px flex-1 bg-gradient-to-r from-blue-400 to-blue-300" />
      </span>
      <UserAvatar name={assignee.name} avatar={assignee.avatar} size="xs" title={assignee.name} />
      <span className="truncate text-[11px] font-medium text-gray-700">{assignee.name.split(/\s+/)[0]}</span>
    </div>
  );
}
