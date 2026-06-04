import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateStaff, useUpdateStaff } from '../api/settings/StaffQueries';
import { useRoles } from '../api/settings/RoleQueries';
import type { StaffUser, CreateStaffData, UpdateStaffData } from '../api/settings/StaffTypes';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import RoleFormDrawer from './RoleFormDrawer';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { User, Mail, Phone, Key, ShieldCheck, ToggleLeft, Plus } from 'lucide-react';

interface StaffFormDrawerProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffUser | null;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role_id: number;
  is_active: boolean;
}

const emptyForm: FormState = { name: '', email: '', phone: '', password: '', password_confirmation: '', role_id: 0, is_active: true };

export default function StaffFormDrawer({ open, onClose, staff }: StaffFormDrawerProps) {
  const isEditing = !!staff;
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const { data: roles } = useRoles();
  const authUser = useAppSelector((s) => s.auth.user);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? '',
        password: '',
        password_confirmation: '',
        role_id: staff.role_id,
        is_active: staff.is_active,
      });
    } else {
      setForm(emptyForm);
    }
  }, [staff, open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);

  const passwordsMatch = form.password === form.password_confirmation;
  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.email.trim().length > 0 && (isEditing || (form.password.trim().length > 0 && passwordsMatch)) && form.role_id > 0, [form, isEditing, passwordsMatch]);

  const handleSubmit = () => {
    if (isEditing && staff) {
      const payload: UpdateStaffData = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role_id: form.role_id,
        is_active: form.is_active,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      updateMutation.mutate({ id: staff.id, data: payload }, { onSuccess: onClose });
    } else {
      const payload: CreateStaffData = {
        business_id: authUser?.business_id ?? null,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password.trim(),
        password_confirmation: form.password_confirmation.trim(),
        role_id: form.role_id,
      };
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Staff' : 'Add Staff'}
      subtitle={isEditing ? 'Update staff member details' : 'Create a new staff member'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Staff Information</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter staff name" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Enter email address" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Enter phone number" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Role <span className="text-red-500">*</span></label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select className={inputClass} value={form.role_id} onChange={(e) => update('role_id', Number(e.target.value))} required>
                <option value={0}>Select a role</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setRoleDrawerOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-3 h-3" />
              Add Role
            </button>
          </div>
          {!isEditing && (
            <>
              <div>
                <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input className={inputClass} type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Enter password" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input className={inputClass} type="password" value={form.password_confirmation} onChange={(e) => update('password_confirmation', e.target.value)} placeholder="Confirm password" required />
                </div>
                {form.password_confirmation && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </>
          )}
          {isEditing && (
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <ToggleLeft className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          )}
        </div>
      </div>
    </SlideDrawer>
    <RoleFormDrawer
      open={roleDrawerOpen}
      onClose={() => setRoleDrawerOpen(false)}
    />
    </>
  );
}
