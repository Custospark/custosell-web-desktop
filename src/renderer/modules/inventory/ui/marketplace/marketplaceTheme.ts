import type { CSSProperties } from 'react';

/** Marketplace visual tokens — immersive trade floor inspired by board workspaces. */

/** High-quality wholesale warehouse exterior (Unsplash). */
export const MARKETPLACE_HERO_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80';

export function marketplaceWorkspaceStyle(): CSSProperties {
  return {
    backgroundImage: [
      /* Stronger veil so frosted panels keep readable contrast over the photo */
      'linear-gradient(160deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.62) 45%, rgba(15, 23, 42, 0.88) 100%)',
      `url(${MARKETPLACE_HERO_IMAGE})`,
    ].join(', '),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}

export const marketplaceGlassHeader =
  'relative z-40 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur-sm sm:px-4';

/** Opaque enough for WCAG-friendly text on photo backgrounds */
export const marketplaceGlassPanel =
  'rounded-2xl border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-900/15 backdrop-blur-xl backdrop-saturate-150';
