import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutGrid, Play, Search, Shield, Sparkles } from 'lucide-react';
import { Modal } from '../modals/Modal';
import { cn } from '../../utils/cn';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { getDefaultRoute, type BusinessModuleSlug } from '../../utils/moduleAccess';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { PRODUCT_NAME } from '../../brand/custosellBrand';
import { ONBOARDING_INTENT_IDS, type OnboardingIntentId } from '../../../modules/onboarding/onboardingTypes';
import { useUpdateOnboarding } from '../../../modules/onboarding/useOnboardingQueries';
import { CircularCheck, ModuleGrid, SectionHeading, StoreModuleGrid } from './ModuleLauncherTiles';
import { CustosellLoader } from '../loading/CustosellLoader';
import { useAppStoreState } from './useAppStoreState';

interface ModuleLauncherModalProps {
  open: boolean;
  onClose: () => void;
  /** New-account onboarding: welcome header, Get started, then tour prompt. Same picker, same save. */
  welcome?: boolean;
}

const VALID_INTENTS = ONBOARDING_INTENT_IDS as readonly string[];

type WelcomeFinishKind = 'start' | 'tour' | 'later';

export default function ModuleLauncherModal({ open, onClose, welcome = false }: ModuleLauncherModalProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const update = useUpdateOnboarding();
  const [welcomeStep, setWelcomeStep] = useState<'pick' | 'ready'>('pick');
  const [finishing, setFinishing] = useState<WelcomeFinishKind | null>(null);

  const store = useAppStoreState(open, onClose);
  const {
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
    selectAllTotal,
    handleClose,
    handleSelect,
    handleSaveAndClose,
    persistStaged,
  } = store;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setWelcomeStep('pick');
      setFinishing(null);
    });
  }, [open ]);

  const businessItems = isOwner ? workspaceItems : personalFiltered;
  const businessChecked = isOwner ? checkedSlugs : personalChecked;

  /** Ordered picks for intent mapping + landing (workspace first, catalog order). */
  const orderedPicks = useMemo(
    () => [
      ...businessItems.map((item) => item.slug),
      ...everydayFiltered.map((item) => item.slug),
    ].filter((slug) => businessChecked.has(slug) || everydayChecked.has(slug)),
    [businessItems, everydayFiltered, businessChecked, everydayChecked],
  );
  const validIntentPicks = useMemo(
    () => orderedPicks.filter((slug) => VALID_INTENTS.includes(slug)),
    [orderedPicks],
  );
  const firstPick = useMemo(
    () =>
      businessItems.find((item) => businessChecked.has(item.slug))
      ?? everydayFiltered.find((item) => everydayChecked.has(item.slug))
      ?? null,
    [businessItems, everydayFiltered, businessChecked, everydayChecked],
  );
  const firstRoute = firstPick ? firstPick.getRoute(user) : getDefaultRoute(user);

  const finishWelcome = async (kind: WelcomeFinishKind) => {
    setFinishing(kind);
    try {
      let ok = true;
      try {
        await persistStaged();
      } catch (err) {
        ok = false;
        console.warn('[Onboarding] App picks deferred - will sync from Custosell Apps:', err);
      }
      await update.mutateAsync({
        action: 'complete_intent',
        primary_intent: (validIntentPicks[0] ?? 'explore') as OnboardingIntentId,
        secondary_intent: (validIntentPicks[1] ?? null) as OnboardingIntentId | null,
      });
      if (kind !== 'tour') {
        await update.mutateAsync({ action: 'skip_tour' });
      }
      if (!ok) {
        showToast('warning', 'Some picks need internet - adjust anytime in Custosell Apps.');
      }
      if (kind === 'start') {
        navigate(firstRoute);
      }
      if (kind === 'later') {
        showToast('info', 'Take the tour anytime from Tutorials in your profile menu.');
      }
    } catch (err) {
      showToast('error', sanitizeErrorMessage(err, 'Could not finish setup'));
      setFinishing(null);
    }
  };

  const busy = saving || finishing !== null || update.isPending;
  const finishMessage =
    finishing === 'start'
      ? 'Setting up your apps…'
      : finishing === 'tour'
        ? 'Starting your tour…'
        : 'Wrapping up…';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={welcome ? undefined : title}
      subtitle={welcome ? undefined : subtitle}
      titleCentered
      size="2xl"
      bodyClassName={welcome ? 'px-0 py-0' : 'flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4'}
      panelClassName={welcome ? 'overflow-hidden' : undefined}
      hideCloseButton={welcome}
      closeOnEscape={!welcome}
    >
      {welcome && welcomeStep === 'pick' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-5 pb-6 pt-6 text-center text-white">
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-cyan-300/20" />
          <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="relative mt-3 text-xl font-bold tracking-tight sm:text-2xl">
            Welcome to {PRODUCT_NAME}{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="relative mx-auto mt-1.5 max-w-lg text-sm text-indigo-50">
            What do you want to do first? Pick your apps and land straight in your
            workspace - it works even when your internet doesn&apos;t.
          </p>
        </div>
      )}

      {welcome && welcomeStep === 'ready' ? (
        <div className="flex min-h-full flex-col items-center px-5 pb-6 pt-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
          </span>
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            You&apos;re all set{orderedPicks.length > 0 ? ` - ${orderedPicks.length} app${orderedPicks.length === 1 ? '' : 's'} ready` : ''}!
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {firstPick
              ? `Jump straight into ${firstPick.label}, or take the 60-second tour first.`
              : 'Take the 60-second tour first, or explore on your own.'}
          </p>
          <div className="mt-5 flex w-full max-w-md flex-col gap-2">
            {firstPick && (
              <button
                type="button"
                onClick={() => void finishWelcome('start')}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {finishing === 'start' ? 'Starting…' : `Start in ${firstPick.label}`}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => void finishWelcome('tour')}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="h-4 w-4" aria-hidden />
              {finishing === 'tour' ? 'Starting tour…' : 'Take the quick tour'}
            </button>
            <button
              type="button"
              onClick={() => void finishWelcome('later')}
              disabled={busy}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors',
                busy ? 'opacity-50' : 'hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              Later
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-indigo-200/80 bg-indigo-50/30 py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
              />
            </div>
          <p className="shrink-0 text-sm text-gray-600 sm:text-right">
            {countLabel}
          </p>
        </div>

        {!empty && (
          <button
            type="button"
            onClick={toggleSelectAll}
            aria-pressed={selectAllChecked}
            className="flex shrink-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-indigo-200"
          >
            <CircularCheck checked={selectAllChecked} />
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Select all</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">
              {selectAllCount} of {selectAllTotal} selected
            </span>
          </button>
        )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
            {empty ? (
              <p className="py-10 text-center text-sm text-gray-500">
                {emptyLabel}
              </p>
            ) : (
              <div className="space-y-4">
                {(workspaceItems.length > 0 || staffWorkspace.length > 0) && (
                  <section className="space-y-2">
                    <SectionHeading icon={LayoutGrid} label={workspaceLabel} tone="indigo" />
                    {isOwner ? (
                      <StoreModuleGrid
                        items={workspaceItems}
                        checkedSlugs={checkedSlugs}
                        saving={saving || isCompletelyOffline}
                        changedSlugs={businessChanged}
                        onToggle={(slug) => toggleModule(slug as BusinessModuleSlug)}
                      />
                    ) : (
                      <StoreModuleGrid
                        items={staffWorkspace}
                        checkedSlugs={staffChecked}
                        saving={saving}
                        changedSlugs={visibilityChanged}
                        onToggle={stageAppToggle}
                      />
                    )}
                  </section>
                )}
                {showPersonalApps && (
                  <section className="space-y-2">
                    <SectionHeading icon={LayoutGrid} label="Apps" tone="indigo" />
                    <StoreModuleGrid
                      items={personalFiltered}
                      checkedSlugs={personalChecked}
                      saving={saving}
                      changedSlugs={visibilityChanged}
                      onToggle={togglePersonalApp}
                    />
                  </section>
                )}
                {everydayFiltered.length > 0 && (
                  <section className="space-y-2">
                    <SectionHeading icon={Sparkles} label="Everyday" tone="violet" />
                    <StoreModuleGrid
                      items={everydayFiltered}
                      checkedSlugs={everydayChecked}
                      saving={saving}
                      changedSlugs={visibilityChanged}
                      onToggle={toggleEveryday}
                    />
                    <p className="px-0.5 text-[11px] text-gray-500">
                      Uncheck apps to hide them - tap Save changes to apply on all your devices.
                    </p>
                  </section>
                )}
                {platformItems.length > 0 && (
                  <section className="space-y-2">
                    <SectionHeading icon={Shield} label="Platform" tone="violet" />
                    <ModuleGrid
                      items={platformItems}
                      activeSlug={activeSlug}
                      offline={isCompletelyOffline}
                      onSelect={handleSelect}
                    />
                  </section>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/90 pt-3 sm:flex-row sm:items-center">
            {welcome ? (
              <>
                <p className="min-w-0 flex-1 text-xs text-slate-500">
                  Start with what matters - change apps anytime in Custosell Apps.
                </p>
                <button
                  type="button"
                  onClick={() => setWelcomeStep('ready')}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </>
            ) : (
              <>
            <p className="min-w-0 flex-1 text-xs text-slate-500">
              {anythingDirty ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Unsaved:</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold tabular-nums text-indigo-700">
                    {showCount + hideCount} change{(showCount + hideCount) === 1 ? '' : 's'}
                  </span>
                </span>
              ) : isOwner
                ? 'Workspace apps save to your account - Everyday apps sync across your devices.'
                : 'Hidden apps stay hidden on all your devices.'}{' '}
                  {isOwner && (
                    <Link
                      to={ROUTES.SETTINGS.MODULES}
                      onClick={handleClose}
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Full settings
                    </Link>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {anythingDirty ? 'Later' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveAndClose()}
                    disabled={!anythingDirty || saving || isCompletelyOffline}
                    title={isCompletelyOffline ? 'Reconnect to save' : anythingDirty ? 'Save apps' : 'No changes to save'}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all',
                !anythingDirty || saving || isCompletelyOffline
                  ? 'cursor-not-allowed bg-slate-300 shadow-sm'
                  : 'bg-blue-600 px-5 shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98]',
              )}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {welcome && finishing !== null && (
        <CustosellLoader fullPage message={finishMessage} className="z-[30000] bg-white/95" />
      )}
    </Modal>
  );
}
