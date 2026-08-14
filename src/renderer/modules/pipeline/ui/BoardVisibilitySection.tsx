import { useMemo, useState } from 'react';
import type { BoardMemberInput, PipelineVisibility } from '../api/pipelineTypes';
import { useBoardTeamMembers } from '../api/usePipelineQueries';
import BoardMemberPicker from './BoardMemberPicker';
import { PipelineFormSection } from './pipelineFormFields';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import {
  visibilityChangeSummary,
  visibilityOptionLabel,
  visibilityOptionsForWorkspace,
  type BoardWorkspace,
} from './boardVisibilityOptions';
import { Users, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface BoardVisibilitySectionProps {
  workspace: BoardWorkspace;
  /** Selected visibility (may differ from saved while editing). */
  visibility: PipelineVisibility;
  onVisibilityChange: (value: PipelineVisibility) => void;
  /** Saved visibility on the server - omit on create board. */
  savedVisibility?: PipelineVisibility;
  members: BoardMemberInput[];
  onMembersChange: (members: BoardMemberInput[]) => void;
  excludeUserId?: number;
  lockedUserId?: number;
  canManage?: boolean;
  /** When false, skips loading staff (e.g. modal closed). */
  loadTeamMembers?: boolean;
}

export default function BoardVisibilitySection({
  workspace,
  visibility,
  onVisibilityChange,
  savedVisibility,
  members,
  onMembersChange,
  excludeUserId,
  lockedUserId,
  canManage = true,
  loadTeamMembers = true,
}: BoardVisibilitySectionProps) {
  const options = visibilityOptionsForWorkspace(workspace);
  const currentVisibility = savedVisibility ?? visibility;
  const visibilityDirty = savedVisibility != null && visibility !== savedVisibility;

  const { data: teamMembers = [], isLoading, isFetching } = useBoardTeamMembers(workspace, {
    enabled: loadTeamMembers,
  });
  const [memberSearch, setMemberSearch] = useState('');
  const teamQuery = memberSearch.trim().toLowerCase();
  const staffLoading = isLoading || (isFetching && teamMembers.length === 0);

  const visibleTeamMembers = useMemo(
    () => teamMembers
      .filter((person) => person.id !== excludeUserId)
      .filter((person) => !teamQuery || person.name.toLowerCase().includes(teamQuery)),
    [excludeUserId, teamMembers, teamQuery],
  );

  const summaryText = useMemo(
    () => visibilityChangeSummary(currentVisibility, visibility, workspace),
    [currentVisibility, visibility, workspace],
  );

  return (
    <>
      <PipelineFormSection title="Visibility" icon={Users}>
        {savedVisibility != null ? (
          <div
            className={cn(
              'mb-3 rounded-xl border px-3 py-2.5 text-xs',
              visibilityDirty
                ? 'border-amber-200 bg-amber-50/80 text-amber-950'
                : 'border-indigo-100 bg-indigo-50/50 text-indigo-950',
            )}
          >
            <p>
              <span className="font-medium text-gray-600">Current visibility:</span>{' '}
              <span className="font-semibold">{visibilityOptionLabel(savedVisibility, workspace)}</span>
            </p>
            {visibilityDirty && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-gray-600">Switching to:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-900">
                  {visibilityOptionLabel(savedVisibility, workspace)}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  {visibilityOptionLabel(visibility, workspace)}
                </span>
              </p>
            )}
            <p className="mt-1.5 text-[11px] leading-relaxed opacity-90">{summaryText}</p>
          </div>
        ) : (
          <p className="mb-3 text-xs text-gray-500">
            Choose who can access this board. You can change visibility later in board settings.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {options.map(({ value, label, hint, icon: Icon }) => {
            const isCurrent = savedVisibility != null && savedVisibility === value;
            const isSelected = visibility === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => canManage && onVisibilityChange(value)}
                disabled={!canManage}
                className={cn(
                  'relative rounded-xl border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30',
                  !canManage && 'cursor-not-allowed opacity-70',
                )}
              >
                <div className="mb-2 flex flex-wrap gap-1">
                  {isCurrent && (
                    <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-700">
                      Current
                    </span>
                  )}
                  {isSelected && (
                    <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      {savedVisibility != null && visibilityDirty && isSelected && !isCurrent
                        ? 'Switching to'
                        : 'Selected'}
                    </span>
                  )}
                </div>
                <Icon className={cn('mb-1 h-4 w-4', isSelected ? 'text-indigo-600' : 'text-gray-500')} />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
              </button>
            );
          })}
        </div>
      </PipelineFormSection>

      {visibility === 'shared' && (
        <PipelineFormSection title="Invite collaborators" icon={Users}>
          <p className="mb-3 text-xs text-gray-500">
            Invite viewers, contributors, or managers. Only people you add here get access - team visibility is separate.
          </p>
          <BoardMemberPicker
            workspace={workspace}
            value={members}
            onChange={onMembersChange}
            excludeUserId={excludeUserId}
            lockedUserId={lockedUserId}
            canManage={canManage}
            loadTeamMembers={loadTeamMembers}
            maxBoardMembers={undefined}
          />
        </PipelineFormSection>
      )}

      {visibility === 'team' && (
        <PipelineFormSection title="Members with team access" icon={Users}>
          <p className="mb-2 text-xs text-gray-500">
            {workspace === 'estimates'
              ? 'Active staff in your business. Team boards are open to everyone with Projects & Estimates or Pipeline access; shared boards can invite anyone listed here.'
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
                    <span className="truncate text-xs text-gray-500">{person.email ?? '-'}</span>
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

      {visibility === 'private' && (
        <PipelineFormSection title="Private access" icon={Users}>
          <p className="text-xs text-gray-500">
            This board is private. Only the board owner can view or manage it - team visibility and shared invites do not apply.
          </p>
        </PipelineFormSection>
      )}
    </>
  );
}
