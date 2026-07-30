import { useMemo, useState } from 'react';
import { Package, ShoppingBag } from 'lucide-react';
import { useAvailableModules, useMySubscriptions, useSubscribe, useCancelSubscription, useInitiatePayment } from './hooks/usePersonalSubscriptions';
import type { PersonalModule, MySubscription } from './hooks/usePersonalSubscriptions';
import { useToast } from '../../app/contexts/useToast';
import { OwnerModuleTile } from '../settings/ui/OwnerModuleTile';
import { MODULE_LAUNCHER_CATALOG } from '../../shared/components/layout/moduleLauncherCatalog';
import type { BusinessModuleSlug } from '../../shared/utils/moduleAccess';

const PERSONAL_MODULE_SLUGS: BusinessModuleSlug[] = ['pipeline', 'estimates', 'expenses', 'accounting', 'documents'];

function tileForModule(slug: string, module: PersonalModule) {
  const catalogItem = MODULE_LAUNCHER_CATALOG.find((c) => c.slug === slug);
  return {
    slug: slug as BusinessModuleSlug,
    label: module.label,
    description: module.description,
    icon: catalogItem?.icon ?? Package,
    tone: catalogItem?.tone ?? 'bg-slate-50 text-slate-600 ring-slate-100',
    price: module.price_monthly_usd,
  };
}

export default function YourToolsPage() {
  const { success, error: toastError } = useToast();
  const { data: availableModules, isLoading: loadingModules } = useAvailableModules();
  const { data: mySubs, isLoading: loadingMine } = useMySubscriptions();
  const subscribe = useSubscribe();
  const cancelSub = useCancelSubscription();
  const initiatePayment = useInitiatePayment();
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const subscriptionMap = useMemo(() => {
    const map = new Map<string, MySubscription>();
    mySubs?.subscriptions.forEach((s) => map.set(s.module_slug, s));
    return map;
  }, [mySubs]);

  const tiles = useMemo(() => {
    if (!availableModules) return [];
    return availableModules
      .filter((m) => PERSONAL_MODULE_SLUGS.includes(m.slug as BusinessModuleSlug))
      .map((m) => {
        const tile = tileForModule(m.slug, m);
        const sub = subscriptionMap.get(m.slug);
        return {
          ...tile,
          checked: sub?.status === 'active' || sub?.status === 'pending',
          pending: sub?.status === 'pending',
        };
      });
  }, [availableModules, subscriptionMap]);

  const handleToggle = async (slug: string) => {
    const sub = subscriptionMap.get(slug);
    if (sub?.status === 'active' || sub?.status === 'pending') {
      setTogglingSlug(slug);
      try {
        await cancelSub.mutateAsync(sub.id);
        success(`${slug} removed from your tools.`);
      } catch {
        toastError('Failed to remove tool');
      } finally {
        setTogglingSlug(null);
      }
    } else {
      setTogglingSlug(slug);
      try {
        await subscribe.mutateAsync({ module_slug: slug });
        success(`${slug} added!`);
        initiatePayment.mutate(undefined, {
          onError: () => {},
        });
      } catch (e: any) {
        toastError(e?.response?.data?.message ?? 'Failed to add tool');
      } finally {
        setTogglingSlug(null);
      }
    }
  };

  if (loadingModules || loadingMine) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-28 sm:pb-10">
      <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-md shadow-blue-500/20 sm:rounded-2xl sm:p-3">
            <ShoppingBag className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Your Tools</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Pick the tools you need. <strong>$5/mo</strong> each — get <strong>2+</strong> and save <strong>20%</strong>.
              Toggle a tool on to add it to your workspace. Payment is processed automatically.
            </p>
          </div>
        </div>
        {tiles.length > 0 && (
          <div className="hidden shrink-0 items-center gap-3 self-stretch rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:flex lg:self-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Active</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">
                {tiles.filter((t) => t.checked).length}
                <span className="text-sm font-medium text-slate-400">/{tiles.length}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[520px]:gap-3 xl:grid-cols-3">
        {tiles.map((tile) => (
          <OwnerModuleTile
            key={tile.slug}
            slug={tile.slug}
            label={tile.label}
            description={tile.description}
            icon={tile.icon}
            tone={tile.tone}
            checked={tile.checked}
            pending={tile.pending}
            disabled={togglingSlug === tile.slug}
            onToggle={() => handleToggle(tile.slug)}
          />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>${5}/mo</strong> per tool. {tiles.filter((t) => t.checked).length >= 2
            ? <span>Bundle discount applied — <strong>20% off</strong> all tools.</span>
            : <span>Add <strong>2+ tools</strong> to get <strong>20% off</strong> each.</span>}
        </p>
      </div>
    </div>
  );
}


