import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { Shield, Users, UserPlus, UserMinus, Search, Mail } from 'lucide-react';
import type { PlatformRole, PlatformUser } from '../api/PlatformTypes';
import { useBulkAssignPlatformRoles, usePlatformRoleMembers, usePlatformUsers } from '../api/PlatformUserQueries';
import { PipelineModalHero, PipelineFormSection } from '../../pipeline/ui/pipelineFormFields';

interface PlatformRoleMembersModalProps {
  open: boolean;
  role: PlatformRole | null;
  onClose: () => void;
}

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function PlatformRoleMembersModal({ open, role, onClose }: PlatformRoleMembersModalProps) {
  const roleId = role?.id ?? 0;
  const roleName = role?.name ?? '';

  const { data: membersPage, isLoading: membersLoading } = usePlatformRoleMembers(roleId);
  const [candidateSearch, setCandidateSearch] = useState('');
  const debouncedSearch = useDebounced(candidateSearch);

  const candidatesQuery = usePlatformUsers(
    useMemo(() => ({ search: debouncedSearch, per_page: '10' }), [debouncedSearch]),
  );

  const assignMutation = useBulkAssignPlatformRoles();
  const { confirm } = useConfirm();
  const isPending = assignMutation.isPending;

  const members = useMemo(() => membersPage?.data ?? [], [membersPage?.data]);
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const candidates = useMemo(
    () => (candidatesQuery.data?.data ?? []).filter((c) => !memberIds.has(c.id)),
    [candidatesQuery.data?.data, memberIds],
  );

  const handleClose = () => {
    if (isPending) return;
    setCandidateSearch('');
    onClose();
  };

  const assign = (user: PlatformUser) => {
    assignMutation.mutate({ ids: [user.id], role: roleName, action: 'assign' });
  };

  const remove = async (user: PlatformUser) => {
    const confirmed = await confirm({
      title: `Remove ${user.name}?`,
      message: `They will lose the "${roleName}" role and its platform access.`,
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (confirmed) {
      assignMutation.mutate({ ids: [user.id], role: roleName, action: 'revoke' });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={`${roleName || 'Role'} Members`}
      subtitle="Assign or remove users from this platform role"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Shield}
          tone="indigo"
          title={roleName}
          description="Users holding this role can access the platform. Access details come from their modules."
        />

        <PipelineFormSection
          title="Add member"
          icon={UserPlus}
          description="Search users by name or email and assign them this role."
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              disabled={isPending}
              placeholder="Search users..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {debouncedSearch.trim().length >= 2 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
              {candidatesQuery.isLoading ? (
                <div className="p-3 text-sm text-gray-500">Searching...</div>
              ) : candidates.length > 0 ? (
                candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="truncate text-xs text-gray-500">{c.email}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => assign(c)} disabled={isPending}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">No users match "{debouncedSearch}".</div>
              )}
            </div>
          )}

          {debouncedSearch.trim().length < 2 && (
            <p className="mt-1 text-xs text-gray-400">Type at least 2 characters to search for users.</p>
          )}
        </PipelineFormSection>

        <PipelineFormSection
          title={`Current members (${membersPage?.total ?? members.length})`}
          icon={Users}
          description="Users who currently hold this role."
        >
          {membersLoading ? (
            <LoadingSkeleton variant="table" />
          ) : members.length > 0 ? (
            <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                    <div className="flex items-center gap-1 truncate text-xs text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(m)} disabled={isPending} title={`Remove from ${roleName}`}>
                    <UserMinus className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center text-sm text-gray-400">
              No members yet — search above to assign the first one.
            </p>
          )}
          {membersPage && membersPage.total > (membersPage.data?.length ?? 0) && (
            <p className="mt-2 text-xs text-gray-400">
              Showing {membersPage.data?.length ?? 0} of {membersPage.total} members.
            </p>
          )}
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
