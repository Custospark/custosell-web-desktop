import { useMemo, useState } from 'react';
import type { BoardMemberInput, PipelineVisibility } from '../api/pipelineTypes';
import { useBoardTeamMembers } from '../api/usePipelineQueries';
import BoardMemberPicker from './BoardMemberPicker';
import { PipelineFormSection } from './pipelineFormFields';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { visibilityOptionsForWorkspace, type BoardWorkspace } from './boardVisibilityOptions';
import { Users, Loader2 } from 'lucide-react';
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
  const { data: teamMembers = [], isLoading, isFetching } = useBoardTeamMembers(workspace);
  const [memberSearch, setMemberSearch] = useState('');
  const teamQuery = memberSearch.trim().toLowerCase();
  const staffLoading = isLoading || (isFetching && teamMembers.length === 0);

  const visibleTeamMembers = useMemo(
    () => teamMembers
      .filter((person) => person.id !== excludeUserId)
      .filter((person) => !teamQuery || person.name.toLowerCase().includes(teamQuery)),
    [excludeUserId, teamMembers, teamQuery],
  );

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
                  : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30',
                !canManage && 'cursor-not-allowed opacity-70',
              )}
            >
              <Icon className={cn('mb-1 h-4 w-4', visibility === value ? 'text-indigo-600' : 'text-gray-500')} />
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
            </button>
          ))}
        </div>
      </PipelineFormSection>

      {visibility === 'shared' && (
        <PipelineFormSection title="Invite collaborators" icon={Users}>
          <p className="mb-3 text-xs text-gray-500">
            {workspace === 'estimates'
              ? 'Invite viewers or contributors to this personal board. Only people you add here get access — team visibility is separate.'
              : 'Invite viewers or editors to this board. Only people you add here get access — team visibility is separate.'}
          </p>
          <BoardMemberPicker
            workspace={workspace}
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
          {staffLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 py-8 text-sm text-blue-700">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
              Loading team members…
            </div>
          ) : (
            <>
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search team members..."
                className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {visibleTeamMembers.map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2"
                  >
                    <UserIdentityChip
                      name={person.name}
                      avatar={person.avatar}
                      size="sm"
                      nameClassName="text-sm font-medium text-gray-900"
                    />
                    <span className="truncate text-xs text-gray-500">{person.email ?? '—'}</span>
                  </li>
                ))}
              </ul>
              {visibleTeamMembers.length === 0 && (
                <p className="text-xs text-gray-500">No team members found for this workspace.</p>
              )}
            </>
          )}
        </PipelineFormSection>
      )}
    </>
  );
}
