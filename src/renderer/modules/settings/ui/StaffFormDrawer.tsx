import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useCreateStaff, useUpdateStaff } from '../api/settings/StaffQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { getBusinessOwnerId, getStaffAccountRules, isBusinessOwnerStaff } from '../api/settings/staffAccountRules';
import type { CreateStaffData, UpdateStaffData } from '../api/settings/StaffTypes';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import RoleFormDrawer from './RoleFormDrawer';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { User, Mail, Key, ShieldCheck, ToggleLeft, Plus, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';
import {
  assignableStaffModuleSlugs,
  buildStaffModulesPayload,
  BUSINESS_MODULE_SLUGS,
  intersectStaffModulesWithOwner,
  isBusinessOwner,
  MODULE_LABELS,
  staffHasFullEstimatesModule,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';

interface StaffFormDrawerProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffWithSyncMeta | null;
}

interface FormState {
  name: string;
  email: string;
  localPhone: string;
  password: string;
  password_confirmation: string;
  role_id: number | null;
  is_active: boolean;
  modules: BusinessModuleSlug[];
  estimatesFullAccess: boolean;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  localPhone: '',
  password: '',
  password_confirmation: '',
  role_id: 0,
  is_active: true,
  modules: ['sales'],
  estimatesFullAccess: false,
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
  const dispatch = useAppDispatch();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const businessOwnerId = getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const loadedStaffIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      loadedStaffIdRef.current = null;
      return;
    }
    queueMicrotask(() => {
      if (staff) {
        if (loadedStaffIdRef.current === staff.id) return;
        loadedStaffIdRef.current = staff.id;
        const parsedPhone = parseInternationalPhone(staff.phone);
        setCountryCode(parsedPhone.countryCode);
        const ownerAccount = isBusinessOwnerStaff(staff.id, businessOwnerId);
        let staffModules = intersectStaffModulesWithOwner(staff.modules, authUser);
        // Settings is required only for the business owner account (Module Access standard).
        if (ownerAccount && !staffModules.includes('settings')) {
          staffModules = [...staffModules, 'settings'];
        }
        setForm({
          name: staff.name,
          email: staff.email,
          localPhone: parsedPhone.localNumber,
          password: '',
          password_confirmation: '',
          role_id: staff.role_id ?? null,
          is_active: staff.is_active ?? true,
          modules: staffModules,
          estimatesFullAccess: staffHasFullEstimatesModule(staffModules),
        });
      } else {
        loadedStaffIdRef.current = null;
        const defaultRole = roles?.find((r) => r.is_default) ?? roles?.find((r) => r.slug === 'staff');
        setCountryCode(getDefaultCountryCode());
        setForm({
          ...emptyForm,
          role_id: defaultRole?.id ?? 0,
        });
      }
      setShowPassword(false);
      setShowConfirmPassword(false);
    });
  }, [staff, open, roles, authUser, businessOwnerId]);

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
  const emailLocked = Boolean(accountRules?.isBusinessOwner);
  const settingsRequired = Boolean(accountRules?.isBusinessOwner);
  const modulesLocked = false;
  const assignableModules = useMemo(
    () => (authUser && isBusinessOwner(authUser) ? assignableStaffModuleSlugs(authUser) : [...BUSINESS_MODULE_SLUGS]),
    [authUser],
  );

  useEffect(() => {
    if (!open || modulesLocked) return;
    queueMicrotask(() => {
      setForm((prev) => {
        let allowed = intersectStaffModulesWithOwner(prev.modules, authUser);
        if (settingsRequired && !allowed.includes('settings')) {
          allowed = [...allowed, 'settings'];
        }
        const estimatesFullAccess = prev.estimatesFullAccess && allowed.includes('estimates');
        if (
          allowed.length === prev.modules.length
          && allowed.every((m, i) => m === prev.modules[i])
          && estimatesFullAccess === prev.estimatesFullAccess
        ) {
          return prev;
        }
        return { ...prev, modules: allowed, estimatesFullAccess };
      });
    });
  }, [authUser, assignableModules, modulesLocked, open, settingsRequired]);

  const toggleModule = useCallback((module: BusinessModuleSlug) => {
    if (modulesLocked) return;
    if (settingsRequired && module === 'settings') return;
    setForm((prev) => {
      const removing = prev.modules.includes(module);
      let modules = removing
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module];

      // Customers depends on Sales — keep UX aligned with backend normalization.
      if (module === 'customers' && !removing && !modules.includes('sales')) {
        modules = [...modules, 'sales'];
      }
      // Settings is required only when editing the business owner account.
      if (settingsRequired && !modules.includes('settings')) {
        modules = [...modules, 'settings'];
      }
      return {
        ...prev,
        modules,
        estimatesFullAccess: module === 'estimates' && removing ? false : prev.estimatesFullAccess,
      };
    });
  }, [modulesLocked, settingsRequired]);

  const resolvedModules = useMemo(() => {
    const allowed = new Set(assignableModules);
    const filteredModules = form.modules.filter((m) => allowed.has(m));
    if (settingsRequired && !filteredModules.includes('settings') && allowed.has('settings')) {
      filteredModules.push('settings');
    }
    return buildStaffModulesPayload(
      filteredModules,
      form.estimatesFullAccess && filteredModules.includes('estimates'),
    );
  }, [assignableModules, form.estimatesFullAccess, form.modules, settingsRequired]);

  const passwordsMatch = form.password === form.password_confirmation;
  const passwordValid = passwordRequired
    ? form.password.trim().length > 0 && passwordsMatch
    : (!form.password.trim() && !form.password_confirmation.trim()) || (form.password.trim().length > 0 && passwordsMatch);
  const showConfirmPasswordField = passwordRequired || form.password.trim().length > 0;
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

  const fullPhone = buildInternationalPhone(countryCode, form.localPhone) ?? null;

  const handleSubmit = () => {
    if (isEditing && staff) {
      const payload: UpdateStaffData = {
        name: form.name.trim(),
        email: emailLocked ? staff.email : form.email.trim(),
        phone: fullPhone,
        role_id: canChangeRole ? form.role_id || staff.role_id || null : staff.role_id ?? null,
        is_active: accountRules?.canDeactivate === false ? staff.is_active : form.is_active,
        modules: modulesLocked ? undefined : resolvedModules,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
        if (isPendingCreate) {
          payload.password_confirmation = form.password_confirmation.trim();
        }
      }
      updateMutation.mutate({ id: staff.id, data: payload }, {
        onSuccess: async (updatedStaff) => {
          if (staff.id === authUser?.id) {
            try {
              const { data: fresh } = await axiosInstance.get(AUTH.ME);
              const userData = (fresh && typeof fresh === 'object' && 'data' in fresh ? fresh.data : fresh) as AuthUser;
              dispatch(setUser(userData));
              await updateStoredAuthUser(userData);
            } catch {
              // Fallback: apply modules from the save response so the sidebar updates immediately.
              if (authUser && updatedStaff) {
                const fallback: AuthUser = {
                  ...authUser,
                  name: updatedStaff.name,
                  email: updatedStaff.email,
                  phone: updatedStaff.phone ?? authUser.phone,
                  modules: updatedStaff.modules ?? authUser.modules,
                };
                dispatch(setUser(fallback));
                try {
                  await updateStoredAuthUser(fallback);
                } catch { /* non-critical */ }
              }
            }
          }
          onClose();
        },
      });
    } else {
      const payload: CreateStaffData = {
        business_id: authUser?.business_id ?? null,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: fullPhone,
        password: form.password.trim(),
        password_confirmation: form.password_confirmation.trim(),
        role_id: form.role_id ?? 0,
        modules: resolvedModules,
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
      subtitle={
        isEditing
          ? (emailLocked
            ? `Update ${staff?.name ?? 'staff member'} — owner email stays fixed`
            : `Update ${staff?.name ?? 'staff member'} — email and details can be changed`)
          : 'Create a new staff member'
      }
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
          <p className="mt-1">
            {emailLocked
              ? 'Your name, phone, password, and modules can be updated here. Email, role, and self-deactivation stay locked.'
              : 'Your name, email, phone, and password can be updated here. Role changes and self-deactivation are blocked.'}
          </p>
        </div>
      )}
      {accountRules?.isBusinessOwner && !accountRules.isCurrentUser && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="font-medium">Business owner account</p>
          <p className="mt-1">The owner email cannot be changed here, and the account cannot be deactivated.</p>
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
              <input
                className={`${inputClass}${emailLocked ? ' bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="Enter email address"
                required
                readOnly={emailLocked}
                disabled={emailLocked}
                title={emailLocked ? 'Business owner email cannot be changed from staff settings.' : 'Staff email'}
              />
            </div>
            {emailLocked && (
              <p className="text-xs text-gray-500 mt-1">Business owner email is read-only.</p>
            )}
          </div>
          <PhoneNumberField
            label="Phone"
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            value={form.localPhone}
            onChange={(localPhone) => update('localPhone', localPhone)}
          />
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
            {roleHelperText ? (
              <p className="text-xs text-gray-500 mt-1">{roleHelperText}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Job title only — what they can open is set under Module access below.</p>
            )}
            <button type="button" onClick={() => setRoleDrawerOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-3 h-3" />
              Add Role
            </button>
          </div>
          <div>
            <label className={labelClass}>
              {isEditing && !isPendingCreate ? 'New password (optional)' : 'Password'}
              {passwordRequired && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className={`${inputClass} pr-12`}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder={passwordRequired ? 'Enter password' : 'Leave blank to keep current password'}
                required={passwordRequired}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {showConfirmPasswordField && (
          <div>
            <label className={labelClass}>
              Confirm Password {passwordRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className={`${inputClass} pr-12`}
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.password_confirmation}
                onChange={(e) => update('password_confirmation', e.target.value)}
                placeholder="Confirm password"
                required={passwordRequired}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password_confirmation && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          )}
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
            Controls which sections appear in the app. Sales includes My Shift, where staff can record shift expenses.
            Projects &amp; Estimates can be project boards only, or full workspace access when you enable it below.
            Account and Custosell Guide remain available to everyone.
          </p>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Your modules</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignableModules.map((module) => {
              const checked = form.modules.includes(module);
              const locked = modulesLocked || (settingsRequired && module === 'settings');
              return (
                <label
                  key={module}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700'
                  } ${locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-blue-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(module)}
                    disabled={locked}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {MODULE_LABELS[module]}
                  {settingsRequired && module === 'settings' && (
                    <span className="ml-auto text-[10px] font-semibold uppercase text-gray-500">Required</span>
                  )}
                </label>
              );
            })}
          </div>
          {!modulesLocked && form.modules.includes('estimates') && (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.estimatesFullAccess}
                  onChange={(e) => update('estimatesFullAccess', e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800">Full Projects &amp; Estimates workspace</span>
                  <span className="mt-0.5 block text-xs text-gray-600">
                    Grants full access to estimates, projects, insights, templates, project boards, and costing reports — not just project boards.
                  </span>
                </span>
              </label>
            </div>
          )}
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
