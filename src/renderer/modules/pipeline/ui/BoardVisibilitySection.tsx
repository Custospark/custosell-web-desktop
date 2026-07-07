import { useState } from 'react';
import type { BoardMemberInput, PipelineVisibility } from '../api/pipelineTypes';
import BoardMemberPicker from './BoardMemberPicker';
import { PipelineFormSection } from './pipelineFormFields';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { visibilityOptionsForWorkspace, type BoardWorkspace } from './boardVisibilityOptions';
import { Users } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface BoardVisibilitySectionProps {
  workspace: BoardWorkspace;
  visibility: PipelineVisibility;
  onVisibilityChange: (value: PipelineVisibility) => void;
  members: BoardMemberInput[];
  onMembersChange: (members: BoardMemberInput[]) => void;
  excludeUserId?: number;
  lockedUserId?: number;
  canManage?: boolean;
}

export default function BoardVisibilitySection({
  workspace,
  visibility,
  onVisibilityChange,
  members,
  onMembersChange,
  excludeUserId,
  lockedUserId,
  canManage = true,
}: BoardVisibilitySectionProps) {
  const options = visibilityOptionsForWorkspace(workspace);
  const { data: staff = [] } = useStaff();
  const [memberSearch, setMemberSearch] = useState('');
  const teamQuery = memberSearch.trim().toLowerCase();
  const moduleSlug = workspace === 'estimates' ? 'estimates' : 'pipeline';

  const teamMembers = staff
    .filter((person) => person.id !== excludeUserId && (person.modules ?? []).includes(moduleSlug))
    .filter((person) => !teamQuery || person.name.toLowerCase().includes(teamQuery));

  return (
    <>
      <PipelineFormSection title="Visibility" icon={Users}>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => canManage && onVisibilityChange(value)}
              disabled={!canManage}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                visibility === value
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300',
                !canManage && 'cursor-not-allowed opacity-70',
              )}
            >
              <Icon className="mb-1 h-4 w-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
            </button>
          ))}
        </div>
      </PipelineFormSection>

      {visibility === 'shared' && (
        <PipelineFormSection title="Team members" icon={Users}>
          <p className="mb-2 text-xs text-gray-500">
            Invite specific members and set their permissions for this board.
          </p>
          <BoardMemberPicker
            value={members}
            onChange={onMembersChange}
            excludeUserId={excludeUserId}
            lockedUserId={lockedUserId}
            canManage={canManage}
          />
        </PipelineFormSection>
      )}

      {visibility === 'team' && (
        <PipelineFormSection title="Members with team access" icon={Users}>
          <p className="mb-2 text-xs text-gray-500">
            {workspace === 'estimates'
              ? 'Everyone listed here can access this board through Projects & Estimates module access.'
              : 'Everyone listed here can access this board through Pipeline module access.'}
          </p>
          <input
            type="search"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search team members..."
            className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {teamMembers.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2"
              >
                <span className="truncate text-sm font-medium text-gray-900">{person.name}</span>
                <span className="text-xs text-gray-500">{person.email}</span>
              </li>
            ))}
          </ul>
          {teamMembers.length === 0 && (
            <p className="text-xs text-gray-500">No team members found for this filter.</p>
          )}
        </PipelineFormSection>
      )}
    </>
  );
}
