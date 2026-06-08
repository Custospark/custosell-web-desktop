import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateStaff, useUpdateStaff } from '../api/settings/StaffQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { getBusinessOwnerId, getStaffAccountRules } from '../api/settings/staffAccountRules';
import type { CreateStaffData, UpdateStaffData } from '../api/settings/StaffTypes';
import type { StaffWithSyncMeta } from '../../../app/store/offline/localStaffStore';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import RoleFormDrawer from './RoleFormDrawer';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { User, Mail, Phone, Key, ShieldCheck, ToggleLeft, Plus, LayoutGrid } from 'lucide-react';
import { BUSINESS_MODULE_SLUGS, MODULE_LABELS, type BusinessModuleSlug } from '../../../shared/utils/moduleAccess';

interface StaffFormDrawerProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffWithSyncMeta | null;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role_id: number | null;
  is_active: boolean;
  modules: BusinessModuleSlug[];
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  role_id: 0,
  is_active: true,
  modules: ['sales'],
};

export default function StaffFormDrawer({ open, onClose, staff }: StaffFormDrawerProps) {
  const isEditing = !!staff;
  const isPendingCreate = Boolean(staff?._pendingSync && (staff._mutationType === 'create' || staff.id < 0));
  const passwordRequired = !isEditing || isPendingCreate;
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const { data: roles } = useRoles();
  const { data: business } = useBusiness();
  const authUser = useAppSelector((s) => s.auth.user);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const businessOwnerId = getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (staff) {
        setForm({
          name: staff.name,
          email: staff.email,
          phone: staff.phone ?? '',
          password: '',
          password_confirmation: '',
          role_id: staff.role_id ?? null,
          is_active: staff.is_active,
          modules: (staff.modules ?? []).filter((m): m is BusinessModuleSlug =>
            (BUSINESS_MODULE_SLUGS as readonly string[]).includes(m),
          ),
        });
      } else {
        const defaultRole = roles?.find((r) => r.is_default) ?? roles?.find((r) => r.slug === 'staff');
        setForm({
          ...emptyForm,
          role_id: defaultRole?.id ?? 0,
        });
      }
    });
  }, [staff, open, roles]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);
  const rolesById = useMemo(() => new Map((roles ?? []).filter(Boolean).map((role) => [role.id, role])), [roles]);
  const accountRules = useMemo(
    () => staff
      ? getStaffAccountRules(
        { ...staff, role: staff.role ?? (staff.role_id ? rolesById.get(staff.role_id) : null) ?? null },
        { currentUserId: authUser?.id ?? null, businessOwnerId },
      )
      : null,
    [authUser?.id, businessOwnerId, rolesById, staff],
  );
  const canChangeRole = accountRules?.canChangeRole !== false;
  const currentRole = staff?.role ?? (form.role_id ? rolesById.get(form.role_id) : null) ?? null;
  const currentRoleMissingFromOptions = isEditing && Boolean(form.role_id) && !rolesById.has(form.role_id as number);
  const roleSelectionLocked = isEditing && (!canChangeRole || currentRoleMissingFromOptions);
  const roleDisplayName = currentRole?.name ?? (form.role_id ? `Role #${form.role_id}` : 'No role assigned');
  const roleHelperText = accountRules?.roleChangeBlockedReason
    ?? (currentRoleMissingFromOptions ? 'This role is not available in the editable business role list, so it cannot be changed here.' : null);
  const modulesLocked = Boolean(accountRules?.isBusinessOwner);
  const displayModules = modulesLocked ? [...BUSINESS_MODULE_SLUGS] : form.modules;

  const toggleModule = useCallback((module: BusinessModuleSlug) => {
    if (modulesLocked) return;
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module],
    }));
  }, [modulesLocked]);

  const passwordsMatch = form.password === form.password_confirmation;
  const passwordValid = passwordRequired
    ? form.password.trim().length > 0 && passwordsMatch
    : (!form.password.trim() && !form.password_confirmation.trim()) || (form.password.trim().length > 0 && passwordsMatch);
  const hasRoleForSubmit = isEditing
    ? roleSelectionLocked || Boolean(form.role_id) || Boolean(staff?.role_id)
    : form.role_id !== 0;
  const canSubmit = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.email.trim().length > 0 &&
      passwordValid &&
      hasRoleForSubmit,
    [form, hasRoleForSubmit, passwordValid],
  );

  const handleSubmit = () => {
    if (isEditing && staff) {
      const payload: UpdateStaffData = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role_id: canChangeRole ? form.role_id || staff.role_id || null : staff.role_id ?? null,
        is_active: accountRules?.canDeactivate === false ? staff.is_active : form.is_active,
        modules: modulesLocked ? undefined : form.modules,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
        if (isPendingCreate) {
          payload.password_confirmation = form.password_confirmation.trim();
        }
      }
      updateMutation.mutate({ id: staff.id, data: payload }, { onSuccess: onClose });
    } else {
      const payload: CreateStaffData = {
        business_id: authUser?.business_id ?? null,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password.trim(),
        password_confirmation: form.password_confirmation.trim(),
        role_id: form.role_id ?? 0,
        modules: form.modules,
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
      {staff?._syncFailed && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Sync failed</p>
          <p className="mt-1">{staff._lastError || 'Update the staff details and save to retry sync.'}</p>
        </div>
      )}
      {accountRules?.isCurrentUser && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p className="font-medium">You are editing your own account</p>
          <p className="mt-1">Your name, email, phone, and password can be updated here. Role changes and self-deactivation are blocked.</p>
        </div>
      )}
      {accountRules?.isBusinessOwner && !accountRules.isCurrentUser && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="font-medium">Business owner account</p>
          <p className="mt-1">The owner account cannot be deactivated.</p>
        </div>
      )}
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
            {roleSelectionLocked ? (
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <div
                  className={`${inputClass} bg-gray-50 text-gray-700`}
                  title={roleHelperText ?? 'Staff role'}
                >
                  {roleDisplayName}
                </div>
              </div>
            ) : (
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className={inputClass}
                  value={form.role_id ?? 0}
                  onChange={(e) => update('role_id', Number(e.target.value))}
                  required
                  title="Staff role"
                >
                  <option value={0}>Select a role</option>
                  {roles?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.is_system ? ' (System)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {roleHelperText && (
              <p className="text-xs text-gray-500 mt-1">{roleHelperText}</p>
            )}
            <button type="button" onClick={() => setRoleDrawerOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-3 h-3" />
              Add Role
            </button>
          </div>
          <div>
            <label className={labelClass}>
              Password {passwordRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder={passwordRequired ? 'Enter password' : 'Leave blank to keep current password'}
                required={passwordRequired}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Confirm Password {passwordRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className={inputClass}
                type="password"
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                placeholder="Confirm password"
                required={passwordRequired}
              />
            </div>
            {form.password_confirmation && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          {isEditing && (
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update('is_active', e.target.checked)}
                disabled={accountRules?.canDeactivate === false}
                title={accountRules?.deactivationBlockedReason ?? 'Staff active status'}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <ToggleLeft className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Active</span>
              {accountRules?.deactivationBlockedReason && (
                <span className="text-xs text-gray-500">{accountRules.deactivationBlockedReason}</span>
              )}
            </label>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Module access</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            Choose which parts of the business app this staff member can open. Account and Custosell Guide remain available to everyone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUSINESS_MODULE_SLUGS.map((module) => {
              const checked = displayModules.includes(module);
              return (
                <label
                  key={module}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700'
                  } ${modulesLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-blue-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(module)}
                    disabled={modulesLocked}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {MODULE_LABELS[module]}
                </label>
              );
            })}
          </div>
          {!modulesLocked && form.modules.length === 0 && (
            <p className="text-xs text-amber-700 mt-3">No business modules selected — they will only see Account and Guide.</p>
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
