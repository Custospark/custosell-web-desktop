import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAttachStaff, useCreateStaff, lookupStaffEmail, useUpdateStaff } from '../api/settings/StaffQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { getBusinessOwnerId, getStaffAccountRules, isBusinessOwnerStaff } from '../api/settings/staffAccountRules';
import type { AttachStaffData, CreateStaffData, StaffLookupResult, UpdateStaffData } from '../api/settings/StaffTypes';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import RoleFormDrawer from './RoleFormDrawer';
import { StaffModuleAccessFields } from './StaffModuleAccessFields';
import { StaffFormBanners } from './StaffFormBanners';
import { StaffIdentityFields } from './StaffIdentityFields';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import type { AuthUser } from '../../../app/store/slices/authSlice';
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
  staffHasFullEstimatesModule,
  staffHasFullHrModule,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';

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
  modules: BusinessModuleSlug[];
  estimatesFullAccess: boolean;
  hrFullAccess: boolean;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  localPhone: '',
  password: '',
  password_confirmation: '',
  role_id: 0,
  modules: ['sales'],
  estimatesFullAccess: false,
  hrFullAccess: false,
};

const OTHER_BUSINESS_MESSAGE =
  'This email is already used by someone on another organization. Ask them to detach there first, or use a different email.';
const ALREADY_MEMBER_MESSAGE = 'This person is already on your staff list.';
const PLATFORM_INACTIVE_MESSAGE = 'This account is deactivated by Custosell and cannot be attached.';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function StaffFormDrawer({ open, onClose, staff }: StaffFormDrawerProps) {
  const isEditing = !!staff;
  const isPendingCreate = Boolean(staff?._pendingSync && (staff._mutationType === 'create' || staff.id < 0));
  const createMutation = useCreateStaff();
  const attachMutation = useAttachStaff();
  const updateMutation = useUpdateStaff();
  const { showToast } = useToast();
  const { data: roles } = useRoles();
  const { data: business } = useBusiness();
  const authUser = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const isSubmitting = createMutation.isPending || attachMutation.isPending || updateMutation.isPending;
  const businessOwnerId = getBusinessOwnerId(business, { ignoreAuthFallbackForUserId: authUser?.id ?? null });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lookup, setLookup] = useState<StaffLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const loadedStaffIdRef = useRef<number | null>(null);
  const lookupEmailRef = useRef<string>('');

  const isAttachMode = !isEditing && (lookup?.status === 'unattached' || lookup?.status === 'soft_deleted');
  const lookupBlocksSubmit = !isEditing && (
    lookup?.status === 'already_member'
    || lookup?.status === 'other_business'
    || lookup?.status === 'platform_inactive'
  );
  const passwordRequired = (!isEditing || isPendingCreate) && !isAttachMode;

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
          modules: staffModules,
          estimatesFullAccess: staffHasFullEstimatesModule(staff.modules),
          hrFullAccess: staffHasFullHrModule(staff.modules),
        });
      } else {
        loadedStaffIdRef.current = null;
        const defaultRole = roles?.find((r) => r.is_default) ?? roles?.find((r) => r.slug === 'staff');
        setCountryCode(getDefaultCountryCode());
        setForm({ ...emptyForm, role_id: defaultRole?.id ?? 0 });
      }
      setLookup(null);
      setLookupError(null);
      lookupEmailRef.current = '';
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
        const hrFullAccess = prev.hrFullAccess && allowed.includes('hr');
        if (
          allowed.length === prev.modules.length
          && allowed.every((m, i) => m === prev.modules[i])
          && estimatesFullAccess === prev.estimatesFullAccess
          && hrFullAccess === prev.hrFullAccess
        ) {
          return prev;
        }
        return { ...prev, modules: allowed, estimatesFullAccess, hrFullAccess };
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
      if (module === 'customers' && !removing && !modules.includes('sales')) {
        modules = [...modules, 'sales'];
      }
      if (settingsRequired && !modules.includes('settings')) {
        modules = [...modules, 'settings'];
      }
      return {
        ...prev,
        modules,
        estimatesFullAccess: module === 'estimates' && removing ? false : prev.estimatesFullAccess,
        hrFullAccess: module === 'hr' && removing ? false : prev.hrFullAccess,
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
      form.hrFullAccess && filteredModules.includes('hr'),
    );
  }, [assignableModules, form.estimatesFullAccess, form.hrFullAccess, form.modules, settingsRequired]);

  const passwordsMatch = form.password === form.password_confirmation;
  const passwordValid = passwordRequired
    ? form.password.trim().length > 0 && passwordsMatch
    : isAttachMode
      || (!form.password.trim() && !form.password_confirmation.trim())
      || (form.password.trim().length > 0 && passwordsMatch);
  const showConfirmPasswordField = passwordRequired || form.password.trim().length > 0;
  const hasRoleForSubmit = isEditing
    ? roleSelectionLocked || Boolean(form.role_id) || Boolean(staff?.role_id)
    : form.role_id !== 0;
  const canSubmit = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.email.trim().length > 0 &&
      passwordValid &&
      hasRoleForSubmit &&
      !lookupBlocksSubmit &&
      !lookupLoading,
    [form, hasRoleForSubmit, lookupBlocksSubmit, lookupLoading, passwordValid],
  );

  const fullPhone = buildInternationalPhone(countryCode, form.localPhone) ?? null;

  const runEmailLookup = useCallback(async (rawEmail: string) => {
    const email = rawEmail.trim();
    if (isEditing || !isValidEmail(email)) {
      setLookup(null);
      setLookupError(null);
      lookupEmailRef.current = '';
      return;
    }
    if (lookupEmailRef.current === email.toLowerCase() && lookup) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const result = await lookupStaffEmail(email);
      lookupEmailRef.current = email.toLowerCase();
      setLookup(result);
      if ((result.status === 'unattached' || result.status === 'soft_deleted') && result.user?.name) {
        setForm((prev) => (prev.name.trim() ? prev : { ...prev, name: result.user!.name }));
      }
    } catch (err) {
      setLookup(null);
      lookupEmailRef.current = '';
      const message = sanitizeErrorMessage(err, 'Could not look up this email');
      setLookupError(message);
      showToast('error', message);
    } finally {
      setLookupLoading(false);
    }
  }, [isEditing, lookup, showToast]);

  const handleEmailChange = (value: string) => {
    update('email', value);
    if (!isEditing) {
      setLookup(null);
      setLookupError(null);
      lookupEmailRef.current = '';
    }
  };

  const handleSubmit = () => {
    if (isEditing && staff) {
      const payload: UpdateStaffData = {
        name: form.name.trim(),
        email: emailLocked ? staff.email : form.email.trim(),
        phone: fullPhone,
        role_id: canChangeRole ? form.role_id || staff.role_id || null : staff.role_id ?? null,
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
      return;
    }

    if (isAttachMode) {
      const payload: AttachStaffData = {
        email: form.email.trim(),
        role_id: form.role_id ?? 0,
        modules: resolvedModules,
        name: form.name.trim() || undefined,
        phone: fullPhone,
      };
      attachMutation.mutate(payload, { onSuccess: onClose });
      return;
    }

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
  };

  const inputClass = 'w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <>
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Staff' : isAttachMode ? 'Attach Staff' : 'Add Staff'}
      subtitle={
        isEditing
          ? (emailLocked
            ? `Update ${staff?.name ?? 'staff member'} — owner email stays fixed`
            : `Update ${staff?.name ?? 'staff member'} — email and details can be changed`)
          : isAttachMode
            ? 'Existing account — will attach to this organization'
            : 'Create a new staff member'
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <StaffFormBanners
        syncFailed={Boolean(staff?._syncFailed)}
        syncError={staff?._lastError}
        isCurrentUser={accountRules?.isCurrentUser}
        isBusinessOwner={accountRules?.isBusinessOwner}
        emailLocked={emailLocked}
        isAttachMode={isAttachMode}
        lookupStatus={lookup?.status}
        lookupError={lookupError}
        alreadyMemberMessage={ALREADY_MEMBER_MESSAGE}
        otherBusinessMessage={OTHER_BUSINESS_MESSAGE}
        platformInactiveMessage={PLATFORM_INACTIVE_MESSAGE}
      />
      <StaffIdentityFields
        name={form.name}
        email={form.email}
        localPhone={form.localPhone}
        countryCode={countryCode}
        roleId={form.role_id}
        roles={roles}
        emailLocked={emailLocked}
        roleSelectionLocked={roleSelectionLocked}
        roleDisplayName={roleDisplayName}
        roleHelperText={roleHelperText}
        isEditing={isEditing}
        isPendingCreate={isPendingCreate}
        isAttachMode={isAttachMode}
        lookupLoading={lookupLoading}
        password={form.password}
        passwordConfirmation={form.password_confirmation}
        passwordRequired={passwordRequired}
        showConfirmPasswordField={showConfirmPasswordField}
        passwordsMatch={passwordsMatch}
        showPassword={showPassword}
        showConfirmPassword={showConfirmPassword}
        inputClass={inputClass}
        labelClass={labelClass}
        onNameChange={(value) => update('name', value)}
        onEmailChange={handleEmailChange}
        onEmailBlur={() => { void runEmailLookup(form.email); }}
        onCountryCodeChange={setCountryCode}
        onLocalPhoneChange={(value) => update('localPhone', value)}
        onRoleChange={(roleId) => update('role_id', roleId)}
        onAddRole={() => setRoleDrawerOpen(true)}
        onPasswordChange={(value) => update('password', value)}
        onPasswordConfirmationChange={(value) => update('password_confirmation', value)}
        onToggleShowPassword={() => setShowPassword((v) => !v)}
        onToggleShowConfirmPassword={() => setShowConfirmPassword((v) => !v)}
      />
      <StaffModuleAccessFields
        assignableModules={assignableModules}
        modules={form.modules}
        estimatesFullAccess={form.estimatesFullAccess}
        hrFullAccess={form.hrFullAccess}
        modulesLocked={modulesLocked}
        settingsRequired={settingsRequired}
        onToggleModule={toggleModule}
        onEstimatesFullAccessChange={(value) => update('estimatesFullAccess', value)}
        onHrFullAccessChange={(value) => update('hrFullAccess', value)}
      />
    </SlideDrawer>
    <RoleFormDrawer
      open={roleDrawerOpen}
      onClose={() => setRoleDrawerOpen(false)}
    />
    </>
  );
}
