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

function withRequiredSettings(mods: BusinessModuleSlug[]): BusinessModuleSlug[] {
  return mods.includes('settings') ? mods : [...mods, 'settings'];
}

function modulesSignature(modules: string[]): string {
  return [...modules].sort().join('|');
}

const OWNER_MODULE_TILES = BUSINESS_MODULE_SLUGS.map((slug) => {
  const item = MODULE_LAUNCHER_CATALOG.find((entry) => entry.slug === slug);
  if (!item) {
    throw new Error(`Missing launcher catalog entry for module: ${slug}`);
  }
  return item;
});

/** Business modules the owner's plan actually offers (from plan_features), always including settings.
 *  Never derived from the currently-enabled set, so toggling a module off keeps its tile available. */
function getPlanBusinessCatalog(user: AuthUser | null | undefined): BusinessModuleSlug[] {
  const features = user?.business?.subscription?.plan_features as
    | Record<string, boolean>
    | undefined;
  if (!features) {
    return [...BUSINESS_MODULE_SLUGS];
  }
  const result: BusinessModuleSlug[] = [];
  for (const slug of BUSINESS_MODULE_SLUGS) {
    if (slug === 'settings' || features[slug] === true) {
      result.push(slug);
    }
  }
  return result;
}

export default function OwnerModuleAccessForm() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const planCatalog = useMemo(() => getPlanBusinessCatalog(user), [user]);
  const planSlugs = useMemo(() => new Set<string>(planCatalog), [planCatalog]);

  const planAllowedTiles = useMemo(
    () => OWNER_MODULE_TILES.filter((t) => planSlugs.has(t.slug)),
    [planSlugs],
  );

  const [modules, setModules] = useState<BusinessModuleSlug[]>([]);
  const [estimatesFullAccess, setEstimatesFullAccess] = useState(false);
  const [hrFullAccess, setHrFullAccess] = useState(false);

  useEffect(() => {
    if (!user || !isBusinessOwner(user)) return;
    const nextEstimates = ownerInitialEstimatesFullAccess(user) && planSlugs.has('estimates');
    const nextHr = ownerInitialHrFullAccess(user) && planSlugs.has('hr');
    queueMicrotask(() => {
      const stored = resolvedOwnerBusinessModules(user);
      const nextModules = withRequiredSettings(stored.filter((m) => planSlugs.has(m)));
      setModules((prev) => (modulesSignature(prev) === modulesSignature(nextModules) ? prev : nextModules));
      setEstimatesFullAccess((prev) => (prev === nextEstimates ? prev : nextEstimates));
      setHrFullAccess((prev) => (prev === nextHr ? prev : nextHr));
    });
  }, [user, planSlugs]);

  const resolvedModules = useMemo(
    () => buildStaffModulesPayload(withRequiredSettings(modules), estimatesFullAccess, hrFullAccess),
    [estimatesFullAccess, hrFullAccess, modules],
  );

  const baselineSignature = useMemo(() => {
    if (!user || !isBusinessOwner(user)) return '';
    const stored = resolvedOwnerBusinessModules(user);
    const clamped = withRequiredSettings(stored.filter((m) => planSlugs.has(m)));
    return modulesSignature(
      buildStaffModulesPayload(
        clamped,
        ownerInitialEstimatesFullAccess(user) && planSlugs.has('estimates'),
        ownerInitialHrFullAccess(user) && planSlugs.has('hr'),
      ),
    );
  }, [user, planSlugs]);

  const isDirty = modulesSignature(resolvedModules) !== baselineSignature;
  const planModuleCount = planAllowedTiles.length;
  const enabledCount = withRequiredSettings(modules).length;

  const toggleModule = useCallback((module: BusinessModuleSlug) => {
    if (module === 'settings') return;
    setModules((prev) => {
      const base = withRequiredSettings(prev);
      const removing = base.includes(module);
      if (module === 'estimates' && removing) setEstimatesFullAccess(false);
      if (module === 'hr' && removing) setHrFullAccess(false);
      return withRequiredSettings(removing ? base.filter((m) => m !== module) : [...base, module]);
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
      setModules(withRequiredSettings(resolvedOwnerBusinessModules(freshUser)));
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

  const saveDisabled = !isDirty || saveMutation.isPending;

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-2 sm:pb-10">
      <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-md shadow-blue-500/20 sm:rounded-2xl sm:p-3">
            <LayoutGrid className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Module access</h1>
<p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
  Pick which workspaces you see. Changes here only affect your own account - not your team. Staff access is managed in Staff.
</p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 self-stretch rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:flex lg:self-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Enabled</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {enabledCount}
              <span className="text-sm font-medium text-slate-400">/{planModuleCount}</span>
            </p>
          </div>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={saveDisabled}
            title={isDirty ? 'Save module access' : 'No changes to save'}
          >
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[520px]:gap-3 xl:grid-cols-3">
        {planAllowedTiles.map((item) => {
          const slug = item.slug as BusinessModuleSlug;
          const isSettings = slug === 'settings';
          return (
            <OwnerModuleTile
              key={slug}
              slug={slug}
              label={item.label}
              description={item.description}
              icon={item.icon}
              tone={item.tone}
              checked={isSettings || modules.includes(slug)}
              locked={isSettings}
              disabled={saveMutation.isPending}
              onToggle={() => toggleModule(slug)}
            />
          );
        })}
      </div>

      {(modules.includes('estimates') || modules.includes('hr')) && (
        <div className="mt-5 space-y-3 sm:mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace depth</h2>
          {planSlugs.has('estimates') && modules.includes('estimates') && (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors sm:p-4',
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
                  Estimates, projects, insights, templates, boards, and costing - not just project boards.
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
          {planSlugs.has('hr') && modules.includes('hr') && (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors sm:p-4',
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
                  People admin, departments, payroll, reports, and leave approval - not just attendance and talent tasks.
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

      <div
        className={cn(
          'sticky bottom-0 z-20 -mx-4 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md sm:hidden sm:-mx-6 sm:px-6',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Enabled</p>
            <p className="text-base font-bold tabular-nums text-slate-900">
              {enabledCount}
              <span className="text-sm font-medium text-slate-400">/{planModuleCount}</span>
              {!isDirty ? (
                <span className="ml-2 text-xs font-medium normal-case tracking-normal text-slate-400">No changes</span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 shadow-lg shadow-blue-500/20"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={saveDisabled}
            title={isDirty ? 'Save module access' : 'No changes to save'}
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
