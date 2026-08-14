import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import bagImg from '../../../../../../assets/storefont-bg-images/bag.jpg';
import boutiqueImg from '../../../../../../assets/storefont-bg-images/boutique.jpg';
import boutique2Img from '../../../../../../assets/storefont-bg-images/boutique_2.jpg';
import fridgeImg from '../../../../../../assets/storefont-bg-images/fridge.jpg';
import fridge2Img from '../../../../../../assets/storefont-bg-images/fridge2.jpg';
import marketConversationImg from '../../../../../../assets/storefont-bg-images/market_conversation.jpg';
import openshopImg from '../../../../../../assets/storefont-bg-images/openshop.jpg';
import restaurantImg from '../../../../../../assets/storefont-bg-images/restaurant.jpg';
import restaurant1Img from '../../../../../../assets/storefont-bg-images/restaurant_1.jpg';
import retailImg from '../../../../../../assets/storefont-bg-images/retail.jpg';
import superMarket1Img from '../../../../../../assets/storefont-bg-images/super_market_1.jpg';
import superMarket2Img from '../../../../../../assets/storefont-bg-images/super_market_2.jpg';
import supermarket3Img from '../../../../../../assets/storefont-bg-images/supermarket_3.jpg';
import truckImg from '../../../../../../assets/storefont-bg-images/truck.jpg';
import truck2Img from '../../../../../../assets/storefont-bg-images/truck_2.jpg';
import warehouseImg from '../../../../../../assets/storefont-bg-images/warehouse.jpg';
import wideShopImg from '../../../../../../assets/storefont-bg-images/wide_shop.jpg';

/** Marketplace visual tokens - immersive trade floor inspired by board workspaces. */

export interface MarketplaceHeroSlide {
  /** Bundled local background photo (served from the app, no network needed) */
  url: string;
  /** Solid color shown while loading / if the image fails */
  fallback: string;
  label: string;
}

/** Seventeen local storefront scenes with distinct solid fallbacks. */
export const MARKETPLACE_HERO_SLIDES: readonly MarketplaceHeroSlide[] = [
  {
    label: 'bag',
    url: bagImg,
    fallback: '#0f172a',
  },
  {
    label: 'boutique',
    url: boutiqueImg,
    fallback: '#9d174d',
  },
  {
    label: 'boutique-2',
    url: boutique2Img,
    fallback: '#7c2d12',
  },
  {
    label: 'fridge',
    url: fridgeImg,
    fallback: '#134e4a',
  },
  {
    label: 'fridge-2',
    url: fridge2Img,
    fallback: '#0c4a6e',
  },
  {
    label: 'market-conversation',
    url: marketConversationImg,
    fallback: '#365314',
  },
  {
    label: 'open-shop',
    url: openshopImg,
    fallback: '#1e293b',
  },
  {
    label: 'restaurant',
    url: restaurantImg,
    fallback: '#7f1d1d',
  },
  {
    label: 'restaurant-1',
    url: restaurant1Img,
    fallback: '#581c87',
  },
  {
    label: 'retail',
    url: retailImg,
    fallback: '#164e63',
  },
  {
    label: 'super-market-1',
    url: superMarket1Img,
    fallback: '#14532d',
  },
  {
    label: 'super-market-2',
    url: superMarket2Img,
    fallback: '#78350f',
  },
  {
    label: 'supermarket-3',
    url: supermarket3Img,
    fallback: '#292524',
  },
  {
    label: 'truck',
    url: truckImg,
    fallback: '#1c1917',
  },
  {
    label: 'truck-2',
    url: truck2Img,
    fallback: '#3f3f46',
  },
  {
    label: 'warehouse',
    url: warehouseImg,
    fallback: '#042f2e',
  },
  {
    label: 'wide-shop',
    url: wideShopImg,
    fallback: '#0c4a6e',
  },
] as const;

/** @deprecated Prefer MARKETPLACE_HERO_SLIDES - kept for older imports. */
export const MARKETPLACE_HERO_IMAGE = MARKETPLACE_HERO_SLIDES[0].url;

const HERO_OVERLAY =
  'linear-gradient(160deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.62) 45%, rgba(15, 23, 42, 0.88) 100%)';

const ROTATE_MS = 5_000;

function preloadHero(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Rotates the marketplace hero every 5s, looping forever. Always paints the
 * slide's solid fallback; only layers the photo once it has loaded successfully.
 */
export function useMarketplaceHeroBackground(intervalMs = ROTATE_MS): CSSProperties {
  const [index, setIndex] = useState(0);
  const [loadState, setLoadState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MARKETPLACE_HERO_SLIDES.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    const urls = [
      MARKETPLACE_HERO_SLIDES[index].url,
      MARKETPLACE_HERO_SLIDES[(index + 1) % MARKETPLACE_HERO_SLIDES.length].url,
    ];
    let cancelled = false;

    urls.forEach((url) => {
      void preloadHero(url).then((ok) => {
        if (cancelled) return;
        setLoadState((prev) => (prev[url] !== undefined ? prev : { ...prev, [url]: ok }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [index]);

  const slide = MARKETPLACE_HERO_SLIDES[index];
  const imageReady = loadState[slide.url] === true;
  const layers = imageReady
    ? [HERO_OVERLAY, `url(${slide.url})`].join(', ')
    : HERO_OVERLAY;

  return {
    backgroundColor: slide.fallback,
    backgroundImage: layers,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    transition: 'background-color 0.8s ease',
  };
}

/** Static style helper (no rotation) - uses first slide. */
export function marketplaceWorkspaceStyle(): CSSProperties {
  const slide = MARKETPLACE_HERO_SLIDES[0];
  return {
    backgroundColor: slide.fallback,
    backgroundImage: [HERO_OVERLAY, `url(${slide.url})`].join(', '),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}

export const marketplaceGlassHeader =
  'relative z-40 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur-sm sm:px-4';

/** Opaque enough for WCAG-friendly text on photo backgrounds */
export const marketplaceGlassPanel =
  'rounded-2xl border border-emerald-200/80 bg-white/95 shadow-lg shadow-slate-900/15 backdrop-blur-xl backdrop-saturate-150';
