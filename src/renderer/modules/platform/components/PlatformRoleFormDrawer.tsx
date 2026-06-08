import { useState, useEffect, useCallback, useMemo } from 'react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { Shield, Hash } from 'lucide-react';
import type { PlatformRole } from '../api/PlatformTypes';
import { useCreatePlatformRole, usePlatformPermissions, useUpdatePlatformRole } from '../api/PlatformQueries';
import { inputClass } from '../../../shared/utils/inputStyles';

const BUILT_IN_ROLES = ['platform-admin', 'platform-analyst', 'platform-support'];

interface PlatformRoleFormDrawerProps {
  open: boolean;
  onClose: () => void;
  role?: PlatformRole | null;
}

export function PlatformRoleFormDrawer({ open, onClose, role }: PlatformRoleFormDrawerProps) {
  const isEditing = !!role;
  const { data: permissions = [] } = usePlatformPermissions();
  const createMutation = useCreatePlatformRole();
  const updateMutation = useUpdatePlatformRole();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const isBuiltIn = role ? BUILT_IN_ROLES.includes(role.name) : false;
  const isAdminRole = role?.name === 'platform-admin';

  useEffect(() => {
    if (role) {
      setName(role.name);
      setSelected(role.permissions);
    } else {
      setName('');
      setSelected([]);
    }
  }, [role, open]);

  const togglePermission = useCallback((perm: string) => {
    setSelected((prev) => (
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    ));
  }, []);

  const canSubmit = useMemo(() => {
    if (isEditing) return selected.length > 0 && !isAdminRole;
    return name.trim().length > 2 && selected.length > 0;
  }, [isEditing, name, selected, isAdminRole]);

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
    <SlideDrawer open={open} onClose={onClose} title={isEditing ? 'Edit platform role' : 'Add platform role'}>
      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Hash className="w-4 h-4" /> Role name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEditing || isSubmitting}
            placeholder="e.g. platform-billing"
            className={inputClass}
          />
          {isBuiltIn && (
            <p className="text-xs text-gray-500 mt-1">Built-in role names cannot be changed.</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Shield className="w-4 h-4" /> Permissions
          </label>
          {isAdminRole ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              The platform-admin role has all permissions and cannot be modified.
            </p>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group}</p>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          disabled={isSubmitting}
                          className="rounded border-gray-300"
                        />
                        <span className="font-mono text-xs">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update role' : 'Create role'}
          </button>
        </div>
      </div>
    </SlideDrawer>
  );
}
