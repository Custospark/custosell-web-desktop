import type { CSSProperties } from 'react';
import { getApiUrl } from './env';

/** Reliable rgba from #rgb or #rrggbb for accent surfaces. */
export function surfaceColorAlpha(hex: string | null | undefined, alpha: number): string {
  const raw = (hex ?? '#6366f1').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function surfaceGradientStyle(coverColor: string | null | undefined): CSSProperties {
  const accent = coverColor ?? '#6366f1';
  return {
    background: [
      `linear-gradient(165deg, ${surfaceColorAlpha(accent, 0.38)} 0%, ${surfaceColorAlpha(accent, 0.14)} 28%, ${surfaceColorAlpha(accent, 0.06)} 55%, #f1f5f9 100%)`,
    ].join(', '),
  };
}

export function resolveSurfaceImageUrl(
  backgroundType: string | undefined,
  backgroundValue: string | null | undefined,
): string | null {
  if (!backgroundValue?.trim()) return null;
  const value = backgroundValue.trim();
  if (backgroundType === 'gallery') return value;
  if (backgroundType === 'upload') {
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
      return value;
    }
    const base = getApiUrl().replace(/\/api\/v1\/?$/, '');
    const path = value.replace(/^\/+/, '').replace(/^storage\//, '');
    return `${base}/storage/${path}`;
  }
  return null;
}

export function surfaceImageBackgroundStyle(imageUrl: string): CSSProperties {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
}

export interface SurfaceAppearance {
  cover_color?: string | null;
  background_type?: string | null;
  background_value?: string | null;
}

export function surfaceAppearanceStyle(appearance: SurfaceAppearance): CSSProperties {
  const solidFallback = appearance.cover_color ?? '#6366f1';

  if (appearance.background_type === 'color' && appearance.background_value) {
    return { backgroundColor: appearance.background_value };
  }

  const imageUrl = resolveSurfaceImageUrl(
    appearance.background_type ?? undefined,
    appearance.background_value,
  );
  if (imageUrl && (appearance.background_type === 'gallery' || appearance.background_type === 'upload')) {
    return {
      backgroundColor: solidFallback,
      ...surfaceImageBackgroundStyle(imageUrl),
    };
  }

  return surfaceGradientStyle(appearance.cover_color);
}

export const DOCUMENT_SURFACE = {
  explorer: 'flex h-full min-h-0 flex-col rounded-xl border border-white/50 bg-white/82 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:rounded-2xl',
  panel: 'rounded-2xl border border-white/55 bg-white/85 shadow-md backdrop-blur-lg',
  toolbar: 'border-b border-white/40 bg-white/75 backdrop-blur-md',
  chip: 'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
  rowSelected: 'bg-indigo-500/12 ring-1 ring-indigo-300/60',
  rowHover: 'hover:bg-white/60',
} as const;

export const FOLDER_PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
];

/** Same external gallery set as pipeline kanban boards (picsum). */
export const VAULT_GALLERY_IMAGES = [
  { id: 10, url: 'https://picsum.photos/id/10/1200/800', thumb: 'https://picsum.photos/id/10/400/300' },
  { id: 15, url: 'https://picsum.photos/id/15/1200/800', thumb: 'https://picsum.photos/id/15/400/300' },
  { id: 26, url: 'https://picsum.photos/id/26/1200/800', thumb: 'https://picsum.photos/id/26/400/300' },
  { id: 28, url: 'https://picsum.photos/id/28/1200/800', thumb: 'https://picsum.photos/id/28/400/300' },
  { id: 36, url: 'https://picsum.photos/id/36/1200/800', thumb: 'https://picsum.photos/id/36/400/300' },
  { id: 40, url: 'https://picsum.photos/id/40/1200/800', thumb: 'https://picsum.photos/id/40/400/300' },
  { id: 44, url: 'https://picsum.photos/id/44/1200/800', thumb: 'https://picsum.photos/id/44/400/300' },
  { id: 48, url: 'https://picsum.photos/id/48/1200/800', thumb: 'https://picsum.photos/id/48/400/300' },
  { id: 50, url: 'https://picsum.photos/id/50/1200/800', thumb: 'https://picsum.photos/id/50/400/300' },
  { id: 57, url: 'https://picsum.photos/id/57/1200/800', thumb: 'https://picsum.photos/id/57/400/300' },
  { id: 63, url: 'https://picsum.photos/id/63/1200/800', thumb: 'https://picsum.photos/id/63/400/300' },
  { id: 68, url: 'https://picsum.photos/id/68/1200/800', thumb: 'https://picsum.photos/id/68/400/300' },
  { id: 70, url: 'https://picsum.photos/id/70/1200/800', thumb: 'https://picsum.photos/id/70/400/300' },
  { id: 82, url: 'https://picsum.photos/id/82/1200/800', thumb: 'https://picsum.photos/id/82/400/300' },
  { id: 88, url: 'https://picsum.photos/id/88/1200/800', thumb: 'https://picsum.photos/id/88/400/300' },
  { id: 91, url: 'https://picsum.photos/id/91/1200/800', thumb: 'https://picsum.photos/id/91/400/300' },
  { id: 96, url: 'https://picsum.photos/id/96/1200/800', thumb: 'https://picsum.photos/id/96/400/300' },
  { id: 101, url: 'https://picsum.photos/id/101/1200/800', thumb: 'https://picsum.photos/id/101/400/300' },
  { id: 102, url: 'https://picsum.photos/id/102/1200/800', thumb: 'https://picsum.photos/id/102/400/300' },
  { id: 103, url: 'https://picsum.photos/id/103/1200/800', thumb: 'https://picsum.photos/id/103/400/300' },
  { id: 104, url: 'https://picsum.photos/id/104/1200/800', thumb: 'https://picsum.photos/id/104/400/300' },
  { id: 106, url: 'https://picsum.photos/id/106/1200/800', thumb: 'https://picsum.photos/id/106/400/300' },
];

export const DEFAULT_VAULT_APPEARANCE = {
  cover_color: '#6366f1',
  background_type: 'gallery' as const,
  background_value: VAULT_GALLERY_IMAGES[0]?.url ?? null,
};
