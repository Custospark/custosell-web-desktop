import { ArrowRight } from 'lucide-react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import type { PipelineUserRef } from '../api/pipelineTypes';

interface LeadAssignmentChainProps {
  creator?: PipelineUserRef | null;
  assignee?: PipelineUserRef | null;
  assignees?: PipelineUserRef[];
}

function resolveAssignees(assignee?: PipelineUserRef | null, assignees?: PipelineUserRef[]): PipelineUserRef[] {
  if (assignees?.length) return assignees;
  if (assignee) return [assignee];
  return [];
}

/** Visual link from card creator to assignee(s). */
export default function LeadAssignmentChain({
  creator,
  assignee,
  assignees,
}: LeadAssignmentChainProps) {
  const people = resolveAssignees(assignee, assignees);
  if (people.length === 0) return null;

  if (people.length > 1) {
    const label = people.map((p) => p.name.split(/\s+/)[0]).join(', ');
    return (
      <div
        className="flex min-w-0 max-w-full items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-0.5 pr-2 ring-1 ring-blue-100"
        title={people.map((p) => p.name).join(', ')}
      >
        <div className="flex -space-x-1.5">
          {people.slice(0, 3).map((person) => (
            <UserAvatar
              key={person.id}
              name={person.name}
              avatar={person.avatar}
              size="xs"
              className="ring-2 ring-white"
            />
          ))}
        </div>
        <span className="truncate text-[11px] font-medium text-gray-700">{label}</span>
        {people.length > 3 && (
          <span className="text-[10px] font-semibold text-blue-600">+{people.length - 3}</span>
        )}
      </div>
    );
  }

  const primary = people[0];
  const showCreator = creator && creator.id !== primary.id;

  if (!showCreator) {
    return (
      <UserIdentityChip
        name={primary.name}
        avatar={primary.avatar}
        size="xs"
        className="max-w-[120px] rounded-full bg-gray-50 py-0.5 pl-0.5 pr-2 ring-1 ring-gray-100"
        title={primary.name}
      />
    );
  }

  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-blue-50 py-0.5 pl-0.5 pr-2 ring-1 ring-gray-100"
      title={`${creator.name} assigned to ${primary.name}`}
    >
      <UserAvatar name={creator.name} avatar={creator.avatar} size="xs" title={creator.name} />
      <span className="flex min-w-[20px] flex-1 items-center gap-0.5 px-0.5">
        <span className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-400 to-blue-400" />
        <ArrowRight className="h-3 w-3 shrink-0 text-blue-500" aria-hidden />
        <span className="h-px flex-1 bg-gradient-to-r from-blue-400 to-blue-300" />
      </span>
      <UserAvatar name={primary.name} avatar={primary.avatar} size="xs" title={primary.name} />
      <span className="truncate text-[11px] font-medium text-gray-700">{primary.name.split(/\s+/)[0]}</span>
    </div>
  );
}
