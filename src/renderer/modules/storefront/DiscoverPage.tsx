import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Compass, Store } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import { prefetchStorefrontCatalogs } from './api/storefrontQueries';
import { useDiscoverShell } from './ui/discoverShellContext';
import { DiscoverProductsBrowse } from './ui/DiscoverProductsBrowse';
import { DiscoverShopsBrowse } from './ui/DiscoverShopsBrowse';

/**
 * Shops / Products — both panels stay mounted; tab click only toggles visibility (instant).
 * Rendered as the `/discover` route element (Outlet), not dual-mounted by the layout.
 */
export default function DiscoverPage() {
  const { setHeader } = useDiscoverShell();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get('focus') === 'products' ? 'products' : 'shops';

  useEffect(() => {
    void prefetchStorefrontCatalogs(queryClient);
  }, [queryClient]);

  useEffect(() => {
    setHeader({
      title: focus === 'products' ? 'Products' : 'Shops',
      subtitle:
        focus === 'products'
          ? 'Browse listed products from every public shop'
          : 'Browse businesses with a public storefront',
    });
    return () => {
      setHeader(null);
    };
  }, [focus, setHeader]);

  const setFocus = (next: 'shops' | 'products') => {
    if (next === focus) return;
    setSearchParams({ focus: next }, { replace: true });
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-2">
      <div className={cn(marketplaceGlassPanel, 'flex shrink-0 gap-1.5 p-1.5 shadow-md')}>
        <ModeTab
          active={focus === 'shops'}
          icon={<Store className="h-4 w-4" />}
          label="Shops"
          onClick={() => setFocus('shops')}
          tone="teal"
        />
        <ModeTab
          active={focus === 'products'}
          icon={<Compass className="h-4 w-4" />}
          label="Products"
          onClick={() => setFocus('products')}
          tone="amber"
        />
      </div>

      <div className={cn(focus === 'shops' ? 'block' : 'hidden')} aria-hidden={focus !== 'shops'}>
        <DiscoverShopsBrowse />
      </div>
      <div className={cn(focus === 'products' ? 'block' : 'hidden')} aria-hidden={focus !== 'products'}>
        <DiscoverProductsBrowse />
      </div>
    </div>
  );
}

function ModeTab({
  active,
  icon,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone: 'teal' | 'amber';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all',
        'hover:-translate-y-0.5 active:translate-y-0',
        tone === 'teal' && (active
          ? 'border-teal-500 bg-teal-100 text-teal-950 shadow-md ring-2 ring-teal-300/50'
          : 'border-transparent bg-white/70 text-teal-900 hover:border-teal-300'),
        tone === 'amber' && (active
          ? 'border-amber-500 bg-amber-100 text-amber-950 shadow-md ring-2 ring-amber-300/50'
          : 'border-transparent bg-white/70 text-amber-950 hover:border-amber-300'),
      )}
    >
      {icon}
      {label}
    </button>
  );
}
