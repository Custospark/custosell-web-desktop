import { useMemo, useState } from 'react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { cn } from '../../../shared/utils/cn';
import type { DocumentMemberRole, DocumentUserRef } from '../api/documentTypes';
import {
  ACCESS_ROLE_OPTIONS,
  DOCUMENT_ACCESS_OPTIONS,
  type AccessVisibilityValue,
} from '../api/documentAccessLabels';
import { useDocumentStaffPicker } from '../api/useDocumentStaffPicker';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Button } from '../../../shared/components/buttons/Button';

interface DocumentAccessSectionProps {
  visibility: AccessVisibilityValue;
  onVisibilityChange: (value: AccessVisibilityValue) => void;
  selectedMembers: DocumentUserRef[];
  onSelectedMembersChange: (members: DocumentUserRef[]) => void;
  allowInherit?: boolean;
  visibilityOptions?: { value: AccessVisibilityValue; label: string; hint: string }[];
  disabled?: boolean;
}

export function DocumentAccessSection({
  visibility,
  onVisibilityChange,
  selectedMembers,
  onSelectedMembersChange,
  allowInherit = true,
  visibilityOptions,
  disabled = false,
}: DocumentAccessSectionProps) {
  const { data: staff = [], isLoading, isError, refetch } = useDocumentStaffPicker(!disabled);
  const [query, setQuery] = useState('');

  const options = useMemo(
    () => (visibilityOptions ?? DOCUMENT_ACCESS_OPTIONS).filter((option) => allowInherit || option.value !== 'inherit'),
    [allowInherit, visibilityOptions],
  );

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((member) => member.name.toLowerCase().includes(q));
  }, [query, staff]);

  const toggleMember = (member: DocumentUserRef) => {
    const exists = selectedMembers.some((item) => item.id === member.id);
    if (exists) {
      onSelectedMembersChange(selectedMembers.filter((item) => item.id !== member.id));
      return;
    }
    onSelectedMembersChange([...selectedMembers, { ...member, role: 'viewer' }]);
  };

  const setMemberRole = (userId: number, role: DocumentMemberRole) => {
    onSelectedMembersChange(
      selectedMembers.map((member) => (member.id === userId ? { ...member, role } : member)),
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-gray-900">Who can access this?</p>
        <p className="mb-3 text-xs text-gray-500">Choose who can see and work with this item.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onVisibilityChange(option.value)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left transition',
                visibility === option.value
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <p className="text-sm font-medium text-gray-900">{option.label}</p>
              <p className="text-xs text-gray-500">{option.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {visibility === 'selected_staff' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
          <p className="mb-2 text-xs font-medium text-gray-700">Team members</p>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <CustosellLoader />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-center">
              <p className="text-sm text-red-700">Could not load team members.</p>
              <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : staff.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
              No active staff found for this business. Add team members in Settings → Staff.
            </p>
          ) : (
            <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            disabled={disabled}
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {filteredStaff.map((member) => {
              const selected = selectedMembers.find((item) => item.id === member.id);
              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-2 py-2',
                    selected ? 'border-indigo-300 bg-white' : 'border-transparent bg-white/70',
                  )}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMember(member)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <UserAvatar name={member.name} avatar={member.avatar} size="sm" />
                    <span className="truncate text-sm font-medium text-gray-800">{member.name}</span>
                  </button>
                  {selected && (
                    <select
                      value={selected.role ?? 'viewer'}
                      disabled={disabled}
                      onChange={(e) => setMemberRole(member.id, e.target.value as DocumentMemberRole)}
                      className="max-w-[9rem] rounded-md border border-gray-200 px-2 py-1 text-xs"
                      title="Access level"
                    >
                      {ACCESS_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
