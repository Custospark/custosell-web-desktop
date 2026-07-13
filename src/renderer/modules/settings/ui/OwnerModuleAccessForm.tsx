import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { FileSpreadsheet, IdCard, LayoutGrid } from 'lucide-react';
import { staffKeys } from '../api/settings/StaffQueries';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { useToast } from '../../../app/contexts/useToast';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Button } from '../../../shared/components/buttons/Button';
import { MODULE_LAUNCHER_CATALOG } from '../../../shared/components/layout/moduleLauncherCatalog';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { updateStoredAuthUser } from '../../../app/store/offline/auth/secureStorage';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { cn } from '../../../shared/utils/cn';
import {
  buildStaffModulesPayload,
  BUSINESS_MODULE_SLUGS,
  isBusinessOwner,
  ownerInitialEstimatesFullAccess,
  ownerInitialHrFullAccess,
  resolvedOwnerBusinessModules,
  staffHasFullEstimatesModule,
  staffHasFullHrModule,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';
import { OwnerModuleTile } from './OwnerModuleTile';

type ProfileResponse = { data?: AuthUser } | AuthUser;

function extractAuthUser(data: ProfileResponse): AuthUser {
  if (data && typeof data === 'object' && 'data' in data && data.data) {
    return data.data;
  }
  return data as AuthUser;
}

const OWNER_MODULE_TILES = BUSINESS_MODULE_SLUGS.map((slug) => {
  const item = MODULE_LAUNCHER_CATALOG.find((entry) => entry.slug === slug);
  if (!item) {
    throw new Error(`Missing launcher catalog entry for module: ${slug}`);
  }
  return item;
});

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

  const enabledCount = modules.length;

  const toggleModule = useCallback((module: BusinessModuleSlug) => {
    if (module === 'settings') return;
    setModules((prev) => {
      const removing = prev.includes(module);
      if (module === 'estimates' && removing) setEstimatesFullAccess(false);
      if (module === 'hr' && removing) setHrFullAccess(false);
      return removing ? prev.filter((m) => m !== module) : [...prev, module];
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: putData } = await axiosInstance.put<ProfileResponse>(AUTH.PROFILE, {
        modules: resolvedModules,
      });
      const putUser = extractAuthUser(putData);
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
    <div className="mx-auto max-w-4xl pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-md shadow-blue-500/20">
            <LayoutGrid className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Module access</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
              Choose which workspaces appear for your business — same icons as Apps in the navbar.
              Account and Custosell Guide stay available to everyone. Settings stays required for owners.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Enabled</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {enabledCount}
              <span className="text-sm font-medium text-slate-400">/{BUSINESS_MODULE_SLUGS.length}</span>
            </p>
          </div>
          <Button type="button" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OWNER_MODULE_TILES.map((item) => {
          const slug = item.slug as BusinessModuleSlug;
          return (
            <OwnerModuleTile
              key={slug}
              slug={slug}
              label={item.label}
              description={item.description}
              icon={item.icon}
              tone={item.tone}
              checked={modules.includes(slug)}
              locked={slug === 'settings'}
              disabled={saveMutation.isPending}
              onToggle={() => toggleModule(slug)}
            />
          );
        })}
      </div>

      {(modules.includes('estimates') || modules.includes('hr')) && (
        <div className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace depth</h2>
          {modules.includes('estimates') && (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                estimatesFullAccess
                  ? 'border-violet-200 bg-violet-50/70'
                  : 'border-slate-200 bg-white hover:border-violet-100',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Full Projects &amp; Estimates</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  Estimates, projects, insights, templates, boards, and costing — not just project boards.
                </span>
              </span>
              <input
                type="checkbox"
                checked={estimatesFullAccess}
                onChange={(e) => setEstimatesFullAccess(e.target.checked)}
                disabled={saveMutation.isPending}
                className="mt-2 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
            </label>
          )}
          {modules.includes('hr') && (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                hrFullAccess
                  ? 'border-rose-200 bg-rose-50/70'
                  : 'border-slate-200 bg-white hover:border-rose-100',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <IdCard className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Full HR &amp; Payroll</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  People admin, departments, payroll, reports, and leave approval — not just attendance and talent tasks.
                </span>
              </span>
              <input
                type="checkbox"
                checked={hrFullAccess}
                onChange={(e) => setHrFullAccess(e.target.checked)}
                disabled={saveMutation.isPending}
                className="mt-2 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
            </label>
          )}
        </div>
      )}

      <div className="sticky bottom-4 mt-8 flex justify-end sm:hidden">
        <Button
          type="button"
          className="shadow-lg shadow-blue-500/25"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        >
          Save module access
        </Button>
      </div>
    </div>
  );
}
