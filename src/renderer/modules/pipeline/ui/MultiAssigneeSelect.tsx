import { useMemo } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { useBoardResourceMembers } from '../api/usePipelineResourceQueries';
import type { PipelineUserRef } from '../api/pipelineTypes';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import { X } from 'lucide-react';

interface MultiAssigneeSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  className?: string;
  /** Board id — invited board members are merged into the assignee options. */
  boardId?: number;
}

export default function MultiAssigneeSelect({
  value,
  onChange,
  disabled = false,
  className,
  boardId,
}: MultiAssigneeSelectProps) {
  const { data: staff = [] } = useStaff();
  const { data: boardMembers = [] } = useBoardResourceMembers(boardId ?? 0, Boolean(boardId));

  const candidates = useMemo(() => {
    const map = new Map<number, PipelineUserRef>();
    for (const member of staff) map.set(member.id, member);
    for (const member of boardMembers) {
      if (!map.has(member.id)) map.set(member.id, member);
    }
    return [...map.values()];
  }, [staff, boardMembers]);

  const selected = useMemo(
    () => candidates.filter((c) => value.includes(c.id)),
    [candidates, value],
  );

  const toggle = (id: number) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-0.5 pr-1.5 ring-1 ring-blue-100"
            >
              <UserIdentityChip name={member.name} avatar={member.avatar} size="xs" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(member.id)}
                  className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
                  aria-label={`Remove ${member.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <select
        multiple
        value={value.map(String)}
        onChange={(e) => {
          const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
          onChange(ids);
        }}
        disabled={disabled}
        className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50"
      >
        {candidates.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-gray-500">Hold Ctrl or Cmd to select multiple team members.</p>
    </div>
  );
}
