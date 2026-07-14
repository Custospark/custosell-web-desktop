import { User, Users } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressMember } from '../api/boardProgressTypes';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineSelectClass,
} from './pipelineFormFields';

interface BoardTargetOwnershipSectionProps {
  scope: 'board' | 'member';
  memberUserId: number | '';
  assigneeMembers: BoardProgressMember[];
  onScopeChange: (scope: 'board' | 'member') => void;
  onMemberChange: (memberUserId: number | '') => void;
}

export function BoardTargetOwnershipSection({
  scope,
  memberUserId,
  assigneeMembers,
  onScopeChange,
  onMemberChange,
}: BoardTargetOwnershipSectionProps) {
  return (
    <PipelineFormSection
      title="Ownership"
      icon={Users}
      description="Track this target for the whole board or a specific team member."
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onScopeChange('board')}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            scope === 'board'
              ? 'border-violet-500 bg-violet-50 text-violet-800'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50',
          )}
        >
          <Users className="h-4 w-4" />
          Whole board
        </button>
        <button
          type="button"
          onClick={() => onScopeChange('member')}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            scope === 'member'
              ? 'border-violet-500 bg-violet-50 text-violet-800'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50',
          )}
        >
          <User className="h-4 w-4" />
          Individual
        </button>
      </div>

      {scope === 'member' && (
        <PipelineIconField label="Team member" icon={User} required>
          <select
            value={memberUserId}
            onChange={(e) =>
              onMemberChange(e.target.value ? Number(e.target.value) : '')
            }
            className={pipelineSelectClass}
            aria-label="Team member"
          >
            <option value="">Select member…</option>
            {assigneeMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </select>
        </PipelineIconField>
      )}
    </PipelineFormSection>
  );
}
