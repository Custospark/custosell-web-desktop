import { useMemo, useState } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { useBoardResourceMembers } from '../api/usePipelineResourceQueries';
import { usePipelineKanban } from '../api/usePipelineQueries';
import type { PipelineUserRef } from '../api/pipelineTypes';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { CheckSquare, Search, UserRound, X } from 'lucide-react';

interface MultiAssigneeSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  className?: string;
  /** Board id — invited board members are merged into the assignee options. */
  boardId?: number;
}

/**
 * Assignment picker. Candidates resolve the same roster the Members view uses
 * (board creator + invited board members), plus business staff as a fallback.
 *
 * The modal keeps its own draft selection so toggling is instant; "Done" commits
 * the draft to `onChange` once, and removes fire immediately.
 */
export default function MultiAssigneeSelect({
  value,
  onChange,
  disabled = false,
  className,
  boardId,
}: MultiAssigneeSelectProps) {
  const { data: staff = [] } = useStaff();
  const { data: kanbanBoard } = usePipelineKanban(boardId ?? 0);
  const { data: resourceMembers = [] } = useBoardResourceMembers(boardId ?? 0, Boolean(boardId));

  const candidates = useMemo(() => {
    const map = new Map<number, PipelineUserRef>();

    // Board roster first — mirrors the Members view (creator + invited members).
    if (kanbanBoard) {
      if (kanbanBoard.creator) {
        map.set(kanbanBoard.creator.id, kanbanBoard.creator);
      }
      for (const member of kanbanBoard.members ?? []) {
        if (member.user) {
          map.set(member.user.id, member.user);
        } else if (member.user_id) {
          map.set(member.user_id, { id: member.user_id, name: `Member #${member.user_id}` });
        }
      }
    }

    for (const member of resourceMembers) {
      if (!map.has(member.id)) map.set(member.id, member);
    }

    for (const member of staff) {
      if (!map.has(member.id)) {
        map.set(member.id, {
          id: member.id,
          name: member.name,
          email: member.email ?? null,
          avatar: member.avatar ?? null,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [kanbanBoard, resourceMembers, staff]);

  const selected = useMemo(
    () => candidates.filter((c) => value.includes(c.id)),
    [candidates, value],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<number[]>([]);

  const queryLower = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!queryLower) return candidates;
    return candidates.filter(
      (m) =>
        m.name.toLowerCase().includes(queryLower)
        || (m.email?.toLowerCase().includes(queryLower) ?? false),
    );
  }, [candidates, queryLower]);

  const openPicker = () => {
    setDraft(value);
    setQuery('');
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setQuery('');
  };

  const applyDraft = () => {
    onChange(draft);
    closePicker();
  };

  const toggleDraft = (id: number) => {
    if (disabled) return;
    setDraft((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const filteredIds = filtered.map((m) => m.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => draft.includes(id));

  const toggleAllFiltered = () => {
    if (disabled) return;
    setDraft((prev) => {
      if (allFilteredSelected) {
        return prev.filter((v) => !filteredIds.includes(v));
      }
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const removeSelected = (id: number) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== id));
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
                  onClick={() => removeSelected(member.id)}
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

      <Button
        type="button"
        variant={selected.length > 0 ? 'secondary' : 'outline'}
        onClick={openPicker}
        disabled={disabled || candidates.length === 0}
        className="inline-flex w-full items-center justify-center gap-2"
      >
        <UserRound className="h-4 w-4" aria-hidden />
        {selected.length > 0
          ? `Manage assignees (${selected.length})`
          : 'Add assignee'}
      </Button>

      <Modal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setQuery('');
        }}
        title="Assign members"
        subtitle={`${draft.length} selected of ${candidates.length}`}
        size="lg"
      >
        <div className="space-y-3 pb-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name or email…"
              autoFocus
              className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleAllFiltered}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckSquare className="h-4 w-4" aria-hidden />
              {allFilteredSelected
                ? `Clear all ${filtered.length} shown`
                : `Assign all ${filtered.length} shown`}
            </button>
          )}

          <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">
                {candidates.length === 0 ? 'Loading board members…' : 'No members match your search.'}
              </li>
            )}
            {filtered.map((member) => {
              const isSelected = draft.includes(member.id);
              return (
                <li key={member.id}>
                  <label
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors',
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDraft(member.id)}
                      disabled={disabled}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <UserAvatar name={member.name} avatar={member.avatar} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{member.name}</span>
                      {member.email && <span className="block truncate text-xs text-gray-500">{member.email}</span>}
                    </span>
                    {isSelected && <CheckSquare className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="secondary" onClick={closePicker}>
              Cancel
            </Button>
            <Button type="button" onClick={applyDraft}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}