import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { staffKeys } from '../api/settings/StaffQueries';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { useToast } from '../../../app/contexts/useToast';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import {
  buildStaffModulesPayload,
  BUSINESS_MODULE_SLUGS,
  isBusinessOwner,
  MODULE_LABELS,
  ownerInitialEstimatesFullAccess,
  ownerInitialHrFullAccess,
  resolvedOwnerBusinessModules,
  staffHasFullEstimatesModule,
  staffHasFullHrModule,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';
import { LayoutGrid, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';

type ProfileResponse = { data?: AuthUser } | AuthUser;

function extractAuthUser(data: ProfileResponse): AuthUser {
  if (data && typeof data === 'object' && 'data' in data && data.data) {
    return data.data;
  }
  return data as AuthUser;
}

export default function OwnerModuleAccessForm() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [modules, setModules] = useState<BusinessModuleSlug[]>([]);
  const [estimatesFullAccess, setEstimatesFullAccess] = useState(false);
  const [hrFullAccess, setHrFullAccess] = useState(false);

  useEffect(() => {
    if (!user || !isBusinessOwner(user)) return;
    queueMicrotask(() => {
      setModules(resolvedOwnerBusinessModules(user));
      setEstimatesFullAccess(ownerInitialEstimatesFullAccess(user));
      setHrFullAccess(ownerInitialHrFullAccess(user));
    });
  }, [user]);

  const resolvedModules = useMemo(
    () => buildStaffModulesPayload(modules, estimatesFullAccess, hrFullAccess),
    [estimatesFullAccess, hrFullAccess, modules],
  );

  const toggleModule = useCallback((module: BusinessModuleSlug) => {
    if (module === 'settings') return;
    setModules((prev) => {
      const removing = prev.includes(module);
      if (module === 'estimates' && removing) {
        setEstimatesFullAccess(false);
      }
      if (module === 'hr' && removing) {
        setHrFullAccess(false);
      }
      return removing ? prev.filter((m) => m !== module) : [...prev, module];
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Modules-only payload — BE ProfileRequest allows modules without name/email.
      const { data: putData } = await axiosInstance.put<ProfileResponse>(AUTH.PROFILE, {
        modules: resolvedModules,
      });
      const putUser = extractAuthUser(putData);
      // Prefer ME when available; PUT user is enough if ME fails (StaffQueries pattern).
      try {
        const { data: meData } = await axiosInstance.get<ProfileResponse>(AUTH.ME);
        return extractAuthUser(meData);
      } catch {
        return putUser;
      }
    },
    onSuccess: async (freshUser) => {
      dispatch(setUser(freshUser));
      setModules(resolvedOwnerBusinessModules(freshUser));
      setEstimatesFullAccess(staffHasFullEstimatesModule(freshUser.modules));
      setHrFullAccess(staffHasFullHrModule(freshUser.modules));
      try {
        await updateStoredAuthUser(freshUser);
      } catch (err) {
        console.warn('[Modules] Failed to persist module access to local session:', err);
      }
      void queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      showToast('success', 'Module access updated');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update module access'));
    },
  });

  if (!user) return null;
  if (!isBusinessOwner(user)) {
    return <Navigate to={ROUTES.SETTINGS.BUSINESS} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-sm">
          <LayoutGrid className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module access</h1>
          <p className="mt-1 text-sm text-gray-500">
            Controls which sections appear in the app. Sales includes My Shift, where staff can record shift expenses.
            Projects &amp; Estimates and HR &amp; Payroll can be limited self-service, or full workspace access when you enable the options below.
            Account and Custosell Guide remain available to everyone.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">Your modules</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUSINESS_MODULE_SLUGS.map((module) => {
              const checked = modules.includes(module);
              const locked = module === 'settings';
              return (
                <label
                  key={module}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700',
                    locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-blue-200',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(module)}
                    disabled={locked || saveMutation.isPending}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {MODULE_LABELS[module]}
                  {locked && <span className="ml-auto text-[10px] font-semibold uppercase text-gray-500">Required</span>}
                </label>
              );
            })}
          </div>

          {modules.includes('estimates') && (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={estimatesFullAccess}
                  onChange={(e) => setEstimatesFullAccess(e.target.checked)}
                  disabled={saveMutation.isPending}
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

          {modules.includes('hr') && (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={hrFullAccess}
                  onChange={(e) => setHrFullAccess(e.target.checked)}
                  disabled={saveMutation.isPending}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800">Full HR &amp; Payroll workspace</span>
                  <span className="mt-0.5 block text-xs text-gray-600">
                    Grants people admin, departments, payroll, reports, and leave approval — not just attendance, leave requests, and talent tasks.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            >
              Save module access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
