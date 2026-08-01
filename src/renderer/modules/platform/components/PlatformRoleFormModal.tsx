import { useCallback, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Shield, Hash, Check } from 'lucide-react';
import type { PlatformRole } from '../api/PlatformTypes';
import { useCreatePlatformRole, usePlatformPermissions, useUpdatePlatformRole } from '../api/PlatformUserQueries';
import { PipelineModalHero, PipelineFormSection, PipelineIconField, pipelineInputClass } from '../../pipeline/ui/pipelineFormFields';

const BUILT_IN_ROLES = ['platform-admin', 'platform-analyst', 'platform-support'];

interface PlatformRoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: PlatformRole | null;
}

export function PlatformRoleFormModal({ isOpen, onClose, role }: PlatformRoleFormModalProps) {
  const isEditing = !!role;
  const { data: permissions = [] } = usePlatformPermissions();
  const createMutation = useCreatePlatformRole();
  const updateMutation = useUpdatePlatformRole();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState(role?.name ?? '');
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? []);
  const isBuiltIn = role ? BUILT_IN_ROLES.includes(role.name) : false;
  const isAdminRole = role?.name === 'platform-admin';

  const togglePermission = useCallback((perm: string) => {
    setSelected((prev) => (
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    ));
  }, []);

  const canSubmit = useMemo(() => {
    if (isEditing) return selected.length > 0 && !isAdminRole;
    return name.trim().length > 2 && selected.length > 0;
  }, [isEditing, name, selected, isAdminRole]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isEditing && role) {
      updateMutation.mutate({ id: role.id, permissions: selected }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name: name.trim(), permissions: selected }, { onSuccess: onClose });
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const perm of permissions) {
      const parts = perm.split('.');
      const group = parts.slice(0, 2).join('.');
      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    }
    return groups;
  }, [permissions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Platform Role' : 'Add Platform Role'}
      subtitle={isEditing ? 'Update role permissions' : 'Create a new operator role'}
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Shield}
          tone="indigo"
          title={isEditing ? 'Update platform role' : 'New platform role'}
          description={
            isEditing
              ? `Adjust which permissions "${role?.name}" grants to operators`
              : 'Create a role and pick the platform permissions it grants'
          }
        />

        <PipelineFormSection
          title="Role details"
          icon={Hash}
          description="A short name for the operator role."
        >
          <PipelineIconField label="Role name" icon={Hash} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEditing || isSubmitting}
              placeholder="e.g. platform-billing"
              className={pipelineInputClass}
              required
            />
          </PipelineIconField>
          {isBuiltIn && (
            <p className="text-xs text-gray-500">Built-in role names cannot be changed.</p>
          )}
        </PipelineFormSection>

        <PipelineFormSection
          title="Permissions"
          icon={Shield}
          description="What this role is allowed to do on the platform."
        >
          {isAdminRole ? (
            <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
              The platform-admin role has all permissions and cannot be modified.
            </p>
          ) : (
            <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {perms.map((perm) => (
                      <label key={perm} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 text-sm text-gray-700 hover:border-blue-200 hover:bg-blue-50/50">
                        <input
                          type="checkbox"
                          checked={selected.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          disabled={isSubmitting}
                          className="rounded border-gray-300"
                        />
                        <span className="truncate font-mono text-xs">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
