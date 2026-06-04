import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateRole, useUpdateRole } from '../api/settings/RoleQueries';
import type { Role, CreateRoleData } from '../api/settings/RoleTypes';
import { PERMISSIONS } from '../api/settings/RoleTypes';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { Shield, Hash, AlignLeft, ToggleLeft } from 'lucide-react';

interface RoleFormDrawerProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  is_default: boolean;
}

const emptyForm: FormState = { name: '', slug: '', description: '', permissions: [], is_default: false };

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function RoleFormDrawer({ open, onClose, role }: RoleFormDrawerProps) {
  const isEditing = !!role;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (role) {
      setForm({
        name: role.name,
        slug: role.slug,
        description: role.description ?? '',
        permissions: role.permissions,
        is_default: role.is_default,
      });
    } else {
      setForm(emptyForm);
    }
  }, [role, open]);

  useEffect(() => {
    if (!isEditing) {
      setForm((p) => ({ ...p, slug: slugify(p.name) }));
    }
  }, [form.name, isEditing]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);

  const togglePermission = useCallback((perm: string) => {
    setForm((p) => ({
      ...p,
      permissions: p.permissions.includes(perm) ? p.permissions.filter((x) => x !== perm) : [...p.permissions, perm],
    }));
  }, []);

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.slug.trim().length > 0, [form]);

  const handleSubmit = () => {
    const payload: CreateRoleData = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      permissions: form.permissions,
      is_default: form.is_default,
    };
    if (isEditing && role) {
      updateMutation.mutate({ id: role.id, data: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const textareaClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Role' : 'Add Role'}
      subtitle={isEditing ? 'Update role and permissions' : 'Create a new role'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      width="sm:w-[640px]"
    >
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Role Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter role name" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Slug <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.slug} onChange={(e) => update('slug', e.target.value)} placeholder="role-slug" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea className={textareaClass} rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Optional description" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Permissions</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{perm}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 p-2">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => update('is_default', e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <ToggleLeft className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Default role for new staff</span>
      </label>
    </SlideDrawer>
  );
}
