import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import {
  BUSINESS_MODULE_SLUGS,
  buildStaffModulesPayload,
  getDefaultRoute,
  getPlanAccessibleModules,
  isBusinessOwner,
  ownerInitialEstimatesFullAccess,
  ownerInitialHrFullAccess,
  resolvedOwnerBusinessModules,
  resolveModuleForPath,
  type BusinessModuleSlug,
} from '../../utils/moduleAccess';
import {
  MODULE_LAUNCHER_CATALOG,
  getLauncherModulesForUser,
  getPlanBusinessCatalog,
  sortLauncherModules,
  type ModuleLauncherItem,
} from './moduleLauncherCatalog';
import { isOnlineOnlyLauncherSlug } from './onlineOnlyNav';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { usePlanAccessibleModules } from '../../utils/usePlanAccessibleModules';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import {
  EVERYDAY_SLUGS,
  getHiddenStoreApps,
  type ToggleableDefaultApp,
} from './storeAppVisibility';
import { saveStoreApps, withSaveTimeout } from './appStoreApi';

function withRequiredSettings(mods: BusinessModuleSlug[]): BusinessModuleSlug[] {
  return mods.includes('settings') ? mods : [...mods, 'settings'];
}

function modulesSignature(modules: string[]): string {
  return [...modules].sort().join('|');
}

/**
 * All App Store state + data logic (the modal file stays render-only).
 * Toggles stage locally for every account type; one Save applies workspace
 * grants (owners) and synced visibility (everyone) in a single go.
 */
export function useAppStoreState(open: boolean, onClose: () => void) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const { isCompletelyOffline } = useNetworkStatus();
  const planModules = usePlanAccessibleModules();
  const [query, setQuery] = useState('');
  const [baselineHidden, setBaselineHidden] = useState<Set<string>>(new Set());

  const isPersonal = user?.account_type === 'personal';
  const isOwner = isBusinessOwner(user) && !isPersonal;
  const planCatalog = useMemo(() => getPlanBusinessCatalog(user), [user]);
  const planSlugs = useMemo(() => new Set<string>(planCatalog), [planCatalog]);

  // Personal business apps resolve from plan features, so they toggle through
  // the synced visibility layer (same as Everyday apps), not the modules API.
  const personalCatalog = useMemo(
    () =>
      BUSINESS_MODULE_SLUGS.filter((slug) => planModules.includes(slug))
        .map((slug) => MODULE_LAUNCHER_CATALOG.find((entry) => entry.slug === slug))
        .filter((entry): entry is ModuleLauncherItem => Boolean(entry)),
    [planModules],
  );

  const storeCatalog = useMemo(
    () =>
      planCatalog
        .map((slug) => MODULE_LAUNCHER_CATALOG.find((entry) => entry.slug === slug))
        .filter((entry): entry is ModuleLauncherItem => Boolean(entry)),
    [planCatalog],
  );

  const everydayCatalog = useMemo(
    () =>
      EVERYDAY_SLUGS.map((slug) => MODULE_LAUNCHER_CATALOG.find((entry) => entry.slug === slug)).filter(
        (entry): entry is ModuleLauncherItem => Boolean(entry),
      ),
    [],
  );

  const [modules, setModules] = useState<BusinessModuleSlug[]>([]);
  const [estimatesFullAccess, setEstimatesFullAccess] = useState(false);
  const [hrFullAccess, setHrFullAccess] = useState(false);
  const [hiddenDefaults, setHiddenDefaults] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const wasOpenRef = useRef(false);

  // Init once per open session (deferred like OwnerModuleAccessForm) - a
  // background user refresh must never wipe staged picks.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    queueMicrotask(() => {
      const baseline = getHiddenStoreApps(user);
      setHiddenDefaults(new Set(baseline));
      setBaselineHidden(new Set(baseline));
    });
  }, [open, user]);

  useEffect(() => {
    if (!open || !isOwner || !user) return;
    queueMicrotask(() => {
      const nextEstimates = ownerInitialEstimatesFullAccess(user) && planSlugs.has('estimates');
      const nextHr = ownerInitialHrFullAccess(user) && planSlugs.has('hr');
      const stored = resolvedOwnerBusinessModules(user);
      const nextModules = withRequiredSettings(stored.filter((m) => planSlugs.has(m)));
      setModules((prev) => (modulesSignature(prev) === modulesSignature(nextModules) ? prev : nextModules));
      setEstimatesFullAccess((prev) => (prev === nextEstimates ? prev : nextEstimates));
      setHrFullAccess((prev) => (prev === nextHr ? prev : nextHr));
    });
  }, [open, isOwner, user, planSlugs]);

  const resolvedModules = useMemo(
    () => buildStaffModulesPayload(withRequiredSettings(modules), estimatesFullAccess, hrFullAccess),
    [estimatesFullAccess, hrFullAccess, modules],
  );

  const baselineBusiness = useMemo<string[]>(() => {
    if (!user || !isOwner) return [];
    const stored = resolvedOwnerBusinessModules(user);
    const clamped = withRequiredSettings(stored.filter((m) => planSlugs.has(m)));
    return buildStaffModulesPayload(
      clamped,
      ownerInitialEstimatesFullAccess(user) && planSlugs.has('estimates'),
      ownerInitialHrFullAccess(user) && planSlugs.has('hr'),
    );
  }, [user, isOwner, planSlugs]);

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

  // Staged only - nothing leaves the modal until Save changes.
  const stageAppToggle = useCallback((slug: string) => {
    setHiddenDefaults((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const toggleEveryday = stageAppToggle;

  const togglePersonalApp = stageAppToggle;

  /** Staged-vs-saved diffs - Save changes applies all of these in a single go.
   *  Business legs only exist for owners (everyone else toggles visibility);
   *  without that scoping, non-owners would see a phantom diff on open. */
  const stagedBusinessSet = useMemo(
    () => new Set<string>(isOwner ? resolvedModules : []),
    [isOwner, resolvedModules],
  );
  const baselineBusinessSet = useMemo(() => new Set<string>(baselineBusiness), [baselineBusiness]);
  const businessAdded = useMemo(
    () => [...stagedBusinessSet].filter((m) => !baselineBusinessSet.has(m)),
    [stagedBusinessSet, baselineBusinessSet],
  );
  const businessRemoved = useMemo(
    () => [...baselineBusinessSet].filter((m) => !stagedBusinessSet.has(m)),
    [stagedBusinessSet, baselineBusinessSet],
  );
  const businessChanged = useMemo(
    () => new Set<string>([...businessAdded, ...businessRemoved]),
    [businessAdded, businessRemoved],
  );
  const isDirty = isOwner && businessChanged.size > 0;
  const visibilityHiddenNow = useMemo(
    () => [...hiddenDefaults].filter((m) => !baselineHidden.has(m)),
    [hiddenDefaults, baselineHidden],
  );
  const visibilityShownNow = useMemo(
    () => [...baselineHidden].filter((m) => !hiddenDefaults.has(m)),
    [hiddenDefaults, baselineHidden],
  );
  const visibilityChanged = useMemo(
    () => new Set<string>([...visibilityHiddenNow, ...visibilityShownNow]),
    [visibilityHiddenNow, visibilityShownNow],
  );
  const visibilityDirty = visibilityChanged.size > 0;
  const showCount = businessAdded.length + visibilityShownNow.length;
  const hideCount = businessRemoved.length + visibilityHiddenNow.length;
  const anythingDirty = showCount + hideCount > 0;

  const accessible = useMemo(
    () => sortLauncherModules(
      getLauncherModulesForUser(user, planModules).map((item) =>
        item.slug === 'expenses' && user?.account_type !== 'personal'
          ? { ...item, label: 'Expenses' }
          : item,
      ),
    ),
    [user, planModules],
  );

  const matchesQuery = useCallback((item: ModuleLauncherItem, q: string) => {
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q)
      || item.description.toLowerCase().includes(q)
      || item.slug.toLowerCase().includes(q)
    );
  }, []);

  const navFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Sidebar intersection: listing minus apps hidden in the store.
    // Everyday apps live in their own toggle section below, and personal
    // workspace apps live in the Apps toggle section, so neither duplicates
    // as navigation tiles.
    return accessible.filter(
      (item) =>
        !hiddenDefaults.has(item.slug)
        && !EVERYDAY_SLUGS.includes(item.slug as ToggleableDefaultApp)
        && !(isPersonal && personalCatalog.some((entry) => entry.slug === item.slug))
        && matchesQuery(item, q),
    );
  }, [accessible, hiddenDefaults, isPersonal, matchesQuery, personalCatalog, query]);

  const storeFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return storeCatalog.filter((item) => matchesQuery(item, q));
  }, [storeCatalog, matchesQuery, query]);

  const everydayFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return everydayCatalog.filter((item) => matchesQuery(item, q));
  }, [everydayCatalog, matchesQuery, query]);

  const personalFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalCatalog.filter((item) => matchesQuery(item, q));
  }, [personalCatalog, matchesQuery, query]);

  const filtered = isOwner ? storeFiltered : navFiltered;

  // Staff workspace apps toggle through synced visibility (grants stay owner-managed).
  const staffAll = useMemo(() => {
    if (isOwner || isPersonal) return [] as string[];
    return accessible
      .filter(
        (item) =>
          item.section === 'workspace'
          && !EVERYDAY_SLUGS.includes(item.slug as ToggleableDefaultApp),
      )
      .map((item) => item.slug);
  }, [accessible, isOwner, isPersonal]);
  const staffWorkspace = useMemo(() => {
    if (isOwner || isPersonal) return [];
    const q = query.trim().toLowerCase();
    return accessible.filter(
      (item) =>
        staffAll.includes(item.slug) && matchesQuery(item, q),
    );
  }, [accessible, isOwner, isPersonal, matchesQuery, query, staffAll]);
  const staffChecked = useMemo(
    () => new Set<string>(staffWorkspace.map((item) => item.slug).filter((slug) => !hiddenDefaults.has(slug))),
    [hiddenDefaults, staffWorkspace],
  );

  const workspaceItems = useMemo(
    () => (isOwner ? filtered.filter((item) => item.section === 'workspace') : []),
    [filtered, isOwner],
  );
  const platformItems = useMemo(
    () => (!isOwner ? filtered.filter((item) => item.section === 'platform') : []),
    [filtered, isOwner],
  );

  const activeSlug = resolveModuleForPath(location.pathname);
  const showPersonalApps = isPersonal && personalFiltered.length > 0;
  const empty = workspaceItems.length === 0 && staffWorkspace.length === 0 && everydayFiltered.length === 0 && platformItems.length === 0 && !showPersonalApps;
  const checkedSlugs = useMemo(() => new Set<string>(withRequiredSettings(modules)), [modules]);
  const everydayChecked = useMemo(
    () => new Set<string>(EVERYDAY_SLUGS.filter((slug) => !hiddenDefaults.has(slug))),
    [hiddenDefaults],
  );
  const personalChecked = useMemo(
    () => new Set<string>(
      personalCatalog.map((item) => item.slug).filter((slug) => !hiddenDefaults.has(slug)),
    ),
    [hiddenDefaults, personalCatalog],
  );

  // Global Select all across normal apps + Everyday. Owners drive workspace
  // apps through module grants (settings can never be cleared); everyone else
  // drives everything through synced visibility.
  const selectAllSlugs = useMemo<string[]>(() => {
    const business = isOwner ? planCatalog : isPersonal
      ? personalCatalog.map((item) => item.slug)
      : staffAll;
    return [...business, ...EVERYDAY_SLUGS];
  }, [isOwner, isPersonal, planCatalog, personalCatalog, staffAll]);
  const isSlugChecked = useCallback((slug: string): boolean => (
    isOwner ? checkedSlugs.has(slug) : !hiddenDefaults.has(slug)
  ), [checkedSlugs, hiddenDefaults, isOwner]);
  const selectAllChecked = useMemo(
    () => selectAllSlugs.length > 0 && selectAllSlugs.every(isSlugChecked),
    [selectAllSlugs, isSlugChecked],
  );
  const selectAllCount = useMemo(
    () => selectAllSlugs.filter(isSlugChecked).length,
    [selectAllSlugs, isSlugChecked],
  );
  const toggleSelectAll = useCallback(() => {
    // Owners only ever stage Everyday slugs in the hidden set - workspace
    // apps travel through module grants instead.
    const hiddenTargets = isOwner ? [...EVERYDAY_SLUGS] : selectAllSlugs;
    if (selectAllChecked) {
      if (isOwner) {
        setModules(['settings']);
        setEstimatesFullAccess(false);
        setHrFullAccess(false);
      }
      setHiddenDefaults((prev) => {
        const next = new Set(prev);
        for (const slug of hiddenTargets) {
          if (slug !== 'settings') next.add(slug);
        }
        return next;
      });
    } else {
      if (isOwner) {
        setModules(withRequiredSettings(planCatalog));
      }
      setHiddenDefaults((prev) => {
        const next = new Set(prev);
        for (const slug of hiddenTargets) next.delete(slug);
        return next;
      });
    }
  }, [selectAllChecked, selectAllSlugs, isOwner, planCatalog]);
  const planModuleCount = storeCatalog.length;

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((item: ModuleLauncherItem) => {
    if (isCompletelyOffline && isOnlineOnlyLauncherSlug(item.slug)) return;
    const to = item.getRoute(user);
    setQuery('');
    onClose();
    if (to !== location.pathname) {
      navigate(to);
    }
  }, [isCompletelyOffline, location.pathname, navigate, onClose, user]);

  // Local saving flag (not mutation state) - always reset in finally, so a
  // hung request can never lock the tiles or the Save button.
  // persistStaged is the single write path behind Save changes AND the
  // onboarding finish - same legs, same sequencing, same convergence.
  // Returns the fresh server user so callers resolve from server truth.
  const persistStaged = useCallback(async (): Promise<AuthUser | null> => {
    const result = await withSaveTimeout(saveStoreApps(
      {
        ...(isOwner && isDirty ? { modules: resolvedModules } : {}),
        ...(visibilityDirty ? { hidden: [...hiddenDefaults], userId: user?.id } : {}),
      },
      { dispatch, queryClient },
    ));
    return result.user;
  }, [dispatch, hiddenDefaults, isDirty, isOwner, queryClient, resolvedModules, user, visibilityDirty]);

  const handleSaveAndClose = useCallback(async () => {
    setSaving(true);
    try {
      const savedUser = await persistStaged();
      setBaselineHidden(new Set(hiddenDefaults));
      showToast('success', 'Apps updated');
      handleClose();
      // If the current page's app was just hidden, open the default page of
      // the next visible module instead of stranding the user.
      const currentUser = savedUser ?? user;
      const currentSlug = resolveModuleForPath(location.pathname);
      if (currentSlug && currentUser) {
        const planSet = new Set(getPlanAccessibleModules(currentUser));
        const isVisible = (slug: string) => planSet.has(slug) && !hiddenDefaults.has(slug);
        if (!isVisible(currentSlug)) {
          const order = MODULE_LAUNCHER_CATALOG.map((item) => item.slug);
          const start = order.indexOf(currentSlug);
          const rotation = start >= 0 ? [...order.slice(start + 1), ...order.slice(0, start)] : order;
          const nextSlug = rotation.find(isVisible);
          const nextItem = nextSlug
            ? MODULE_LAUNCHER_CATALOG.find((item) => item.slug === nextSlug)
            : undefined;
          const fallback = nextItem ? nextItem.getRoute(currentUser) : getDefaultRoute(currentUser);
          if (fallback !== location.pathname) {
            navigate(fallback);
          }
        }
      }
    } catch (err) {
      const timedOut = err instanceof Error && err.message === 'Save timed out';
      showToast(
        timedOut ? 'warning' : 'error',
        timedOut
          ? 'Save is taking too long - your picks are kept, check connection and try again.'
          : sanitizeErrorMessage(err, 'Could not save apps - your picks are kept, try again.'),
      );
      // Modal stays open with staged picks intact - edits are re-enabled below.
    } finally {
      setSaving(false);
    }
  }, [handleClose, hiddenDefaults, persistStaged, showToast]);

  const title = 'Custosell Apps';
  const subtitle = 'Pick the apps you need - check to show, uncheck to hide';
  const searchPlaceholder = 'Search apps…';
  // Cumulative on-counts: staged workspace picks plus staged Everyday picks.
  const everydayOn = EVERYDAY_SLUGS.filter((slug) => !hiddenDefaults.has(slug)).length;
  const everydayTotal = EVERYDAY_SLUGS.length;
  const countLabel = isOwner
    ? `${checkedSlugs.size + everydayOn}/${planModuleCount + everydayTotal} on`
    : isPersonal
      ? `${personalChecked.size + everydayOn}/${personalCatalog.length + everydayTotal} on`
      : `${staffChecked.size + everydayOn}/${staffWorkspace.length + everydayTotal} on`;
  const emptyLabel = query.trim() ? 'No apps match your search.' : 'Nothing else is available on your account.';
  const workspaceLabel = isOwner ? 'Apps' : 'Your workspace';

  return {
    query,
    setQuery,
    title,
    subtitle,
    searchPlaceholder,
    countLabel,
    emptyLabel,
    empty,
    workspaceLabel,
    workspaceItems,
    staffWorkspace,
    staffChecked,
    checkedSlugs,
    personalFiltered,
    personalChecked,
    everydayFiltered,
    everydayChecked,
    platformItems,
    activeSlug,
    saving,
    isCompletelyOffline,
    isOwner,
    isPersonal,
    anythingDirty,
    showPersonalApps,
    businessChanged,
    visibilityChanged,
    showCount,
    hideCount,
    toggleModule,
    stageAppToggle,
    toggleEveryday,
    togglePersonalApp,
    toggleSelectAll,
    selectAllChecked,
    selectAllCount,
    selectAllTotal: selectAllSlugs.length,
    handleClose,
    handleSelect,
    handleSaveAndClose,
    persistStaged,
    hiddenDefaults,
    resolvedModules,
  };
}
