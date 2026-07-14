import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

/** Marketplace visual tokens — immersive trade floor inspired by board workspaces. */

export interface MarketplaceHeroSlide {
  /** Unsplash (or CDN) photo URL */
  url: string;
  /** Solid color shown while loading / if the image fails */
  fallback: string;
  label: string;
}

/** Ten wholesale / logistics scenes with distinct solid fallbacks. */
export const MARKETPLACE_HERO_SLIDES: readonly MarketplaceHeroSlide[] = [
  {
    label: 'warehouse-aisle',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80',
    fallback: '#0f172a',
  },
  {
    label: 'loading-dock',
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=2400&q=80',
    fallback: '#134e4a',
  },
  {
    label: 'pallet-stacks',
    url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=2400&q=80',
    fallback: '#1e293b',
  },
  {
    label: 'shipping-containers',
    url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=2400&q=80',
    fallback: '#164e63',
  },
  {
    label: 'forklift-floor',
    url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=2400&q=80',
    fallback: '#292524',
  },
  {
    label: 'cargo-bay',
    url: 'https://images.unsplash.com/photo-1578574577315-52ac8751ddee?auto=format&fit=crop&w=2400&q=80',
    fallback: '#1c1917',
  },
  {
    label: 'distribution-center',
    url: 'https://images.unsplash.com/photo-1580674285054-bed31e145faf?auto=format&fit=crop&w=2400&q=80',
    fallback: '#042f2e',
  },
  {
    label: 'freight-corridor',
    url: 'https://images.unsplash.com/photo-1616432043562-3671ea2e2340?auto=format&fit=crop&w=2400&q=80',
    fallback: '#0c4a6e',
  },
  {
    label: 'shelf-inventory',
    url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2400&q=80',
    fallback: '#14532d',
  },
  {
    label: 'truck-yard',
    url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=2400&q=80',
    fallback: '#3f3f46',
  },
] as const;

/** @deprecated Prefer MARKETPLACE_HERO_SLIDES — kept for older imports. */
export const MARKETPLACE_HERO_IMAGE = MARKETPLACE_HERO_SLIDES[0].url;

const HERO_OVERLAY =
  'linear-gradient(160deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.62) 45%, rgba(15, 23, 42, 0.88) 100%)';

const ROTATE_MS = 30_000;

function preloadHero(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Rotates marketplace hero every 30s. Always paints the slide's solid fallback;
 * only layers the photo when it has loaded successfully.
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

/** Static style helper (no rotation) — uses first slide. */
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
