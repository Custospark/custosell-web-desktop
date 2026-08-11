import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateRole, useUpdateRole } from '../api/settings/RoleQueries';
import type { CreateRoleData } from '../api/settings/RoleTypes';
import type { RoleWithSyncMeta } from '../../../app/store/offline/settings/localRolesStore';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Shield, Hash, AlignLeft, ToggleLeft, Info } from 'lucide-react';

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  role?: RoleWithSyncMeta | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  is_default: boolean;
}

const emptyForm: FormState = { name: '', slug: '', description: '', is_default: false };

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function RoleFormModal({ open, onClose, role }: RoleFormModalProps) {
  const isEditing = !!role;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    queueMicrotask(() => {
      if (role) {
        setForm({
          name: role.name,
          slug: role.slug,
          description: role.description ?? '',
          is_default: role.is_default,
        });
      } else {
        setForm(emptyForm);
      }
    });
  }, [role, open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);
  const updateName = useCallback((name: string) => {
    setForm((p) => ({ ...p, name, slug: isEditing ? p.slug : slugify(name) }));
  }, [isEditing]);

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.slug.trim().length > 0, [form]);

  const handleSubmit = () => {
    const payload: CreateRoleData = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      permissions: [],
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
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? 'Edit Role' : 'Add Role'}
      subtitle="Roles are labels for staff — module access is set per person"
      size="md"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit && !isSubmitting) handleSubmit();
        }}
        className="space-y-4"
      >
        {role?._syncFailed && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Sync failed</p>
            <p className="mt-1">{role._lastError || 'Update the role details and save to retry sync.'}</p>
          </div>
        )}

        <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <p>
            Job title only — what they can open is set under Module access below.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Role Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} value={form.name} onChange={(e) => updateName(e.target.value)} placeholder="e.g. Cashier, Supervisor" required />
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
                <textarea className={textareaClass} rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Optional description for your team" />
              </div>
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

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {isEditing ? 'Save changes' : 'Add Role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
