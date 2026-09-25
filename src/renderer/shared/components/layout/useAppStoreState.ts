import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  BUSINESS_MODULE_SLUGS,
  buildStaffModulesPayload,
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

  /** Staged-vs-saved diffs - Save changes applies all of these in a single go. */
  const stagedBusinessSet = useMemo(() => new Set<string>(resolvedModules), [resolvedModules]);
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
  const staffWorkspace = useMemo(() => {
    if (isOwner || isPersonal) return [];
    const q = query.trim().toLowerCase();
    return accessible.filter(
      (item) =>
        item.section === 'workspace'
        && !EVERYDAY_SLUGS.includes(item.slug as ToggleableDefaultApp)
        && matchesQuery(item, q),
    );
  }, [accessible, isOwner, isPersonal, matchesQuery, query]);
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
  const enabledCount = checkedSlugs.size;
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
  const persistStaged = useCallback(async (): Promise<void> => {
    await withSaveTimeout(saveStoreApps(
      {
        ...(isOwner && isDirty ? { modules: resolvedModules } : {}),
        ...(visibilityDirty ? { hidden: [...hiddenDefaults], userId: user?.id } : {}),
      },
      { dispatch, queryClient },
    ));
  }, [dispatch, hiddenDefaults, isDirty, isOwner, queryClient, resolvedModules, user, visibilityDirty]);

  const handleSaveAndClose = useCallback(async () => {
    setSaving(true);
    try {
      await persistStaged();
      setBaselineHidden(new Set(hiddenDefaults));
      showToast('success', 'Apps updated');
      handleClose();
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
  const countLabel = isOwner
    ? `${enabledCount}/${planModuleCount} on`
    : isPersonal
      ? `${personalChecked.size}/${personalCatalog.length} on`
      : `${staffChecked.size}/${staffWorkspace.length} on`;
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
    handleClose,
    handleSelect,
    handleSaveAndClose,
    persistStaged,
    hiddenDefaults,
    resolvedModules,
  };
}
