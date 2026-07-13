import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAttachStaff, useCreateStaff, lookupStaffEmail, useUpdateStaff } from '../api/settings/StaffQueries';
import { useBusiness } from '../api/settings/BusinessQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { getBusinessOwnerId, getStaffAccountRules, isBusinessOwnerStaff } from '../api/settings/staffAccountRules';
import type { AttachStaffData, CreateStaffData, StaffLookupResult, StaffUser, UpdateStaffData } from '../api/settings/StaffTypes';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { AUTH, USERS } from '../../../shared/api/endpoints/endpoints';
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

export interface StaffFormState {
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

const emptyForm: StaffFormState = {
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

export const STAFF_OTHER_BUSINESS_MESSAGE =
  'This email is already used by someone on another organization. Ask them to detach there first, or use a different email.';
export const STAFF_ALREADY_MEMBER_MESSAGE = 'This person is already on your staff list.';
export const STAFF_PLATFORM_INACTIVE_MESSAGE = 'This account is deactivated by Custosell and cannot be attached.';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function modulesSignature(modules: string[] | null | undefined): string {
  return [...(modules ?? [])].map(String).sort().join('|');
}

function extractUserPayload(raw: unknown): StaffUser | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('data' in raw && raw.data && typeof raw.data === 'object') {
    return raw.data as StaffUser;
  }
  return raw as StaffUser;
}

function hydrateFormFromStaff(
  staff: StaffUser,
  authUser: AuthUser | null | undefined,
  businessOwnerId: number | null,
): { form: StaffFormState; countryCode: CountryCode } {
  const parsedPhone = parseInternationalPhone(staff.phone);
  const ownerAccount = isBusinessOwnerStaff(staff.id, businessOwnerId);
  let staffModules = intersectStaffModulesWithOwner(staff.modules, authUser);
  if (ownerAccount && !staffModules.includes('settings')) {
    staffModules = [...staffModules, 'settings'];
  }
  return {
    countryCode: parsedPhone.countryCode,
    form: {
      name: staff.name,
      email: staff.email,
      localPhone: parsedPhone.localNumber,
      password: '',
      password_confirmation: '',
      role_id: staff.role_id ?? null,
      modules: staffModules,
      estimatesFullAccess: staffHasFullEstimatesModule(staff.modules),
      hrFullAccess: staffHasFullHrModule(staff.modules),
    },
  };
}

export function useStaffForm(open: boolean, staff: StaffWithSyncMeta | null | undefined, onClose: () => void) {
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

  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lookup, setLookup] = useState<StaffLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const hydratedKeyRef = useRef<string | null>(null);
  const lookupEmailRef = useRef<string>('');

  const isAttachMode = !isEditing && (lookup?.status === 'unattached' || lookup?.status === 'soft_deleted');
  const lookupBlocksSubmit = !isEditing && (
    lookup?.status === 'already_member'
    || lookup?.status === 'other_business'
    || lookup?.status === 'platform_inactive'
  );
  const passwordRequired = (!isEditing || isPendingCreate) && !isAttachMode;

  const applyStaffHydration = useCallback((source: StaffUser) => {
    const next = hydrateFormFromStaff(source, authUser, businessOwnerId);
    hydratedKeyRef.current = `${source.id}:${modulesSignature(source.modules)}`;
    setCountryCode(next.countryCode);
    setForm(next.form);
  }, [authUser, businessOwnerId]);

  useEffect(() => {
    if (!open) {
      hydratedKeyRef.current = null;
      return;
    }
    queueMicrotask(() => {
      if (staff) {
        const key = `${staff.id}:${modulesSignature(staff.modules)}`;
        if (hydratedKeyRef.current !== key) {
          applyStaffHydration(staff);
        }
      } else {
        hydratedKeyRef.current = null;
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
  }, [staff, open, roles, applyStaffHydration]);

  // Always refresh from server when editing so module checkboxes match persisted access.
  useEffect(() => {
    if (!open || !staff || staff.id < 0 || staff._pendingSync) return;
    const staffId = staff.id;
    const listSnapshot = staff;
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setDetailLoading(true);
        try {
          const { data } = await axiosInstance.get(USERS.BY_ID(staffId));
          const fresh = extractUserPayload(data);
          if (!cancelled && fresh) {
            applyStaffHydration({
              ...listSnapshot,
              ...fresh,
              modules: fresh.modules ?? listSnapshot.modules ?? [],
            });
          }
        } catch {
          // Keep list snapshot if detail fetch fails (offline / 404).
        } finally {
          if (!cancelled) setDetailLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once per open+id; list snapshot captured above
  }, [open, staff?.id, staff?._pendingSync, applyStaffHydration]);

  const update = useCallback(<K extends keyof StaffFormState>(key: K, val: StaffFormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
  }, []);

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
      form.name.trim().length > 0
      && form.email.trim().length > 0
      && passwordValid
      && hasRoleForSubmit
      && !lookupBlocksSubmit
      && !lookupLoading
      && !detailLoading,
    [detailLoading, form, hasRoleForSubmit, lookupBlocksSubmit, lookupLoading, passwordValid],
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
    if (!canSubmit || isSubmitting) return;
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

  return {
    form,
    update,
    countryCode,
    setCountryCode,
    roles,
    roleDrawerOpen,
    setRoleDrawerOpen,
    showPassword,
    showConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    lookup,
    lookupLoading,
    lookupError,
    detailLoading,
    isEditing,
    isPendingCreate,
    isAttachMode,
    isSubmitting,
    canSubmit,
    passwordRequired,
    showConfirmPasswordField,
    passwordsMatch,
    emailLocked,
    settingsRequired,
    modulesLocked,
    assignableModules,
    roleSelectionLocked,
    roleDisplayName,
    roleHelperText,
    accountRules,
    toggleModule,
    handleEmailChange,
    runEmailLookup,
    handleSubmit,
  };
}
