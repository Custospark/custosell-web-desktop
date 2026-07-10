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
  if (appearance.background_type === 'color' && appearance.background_value) {
    return { backgroundColor: appearance.background_value };
  }

  const imageUrl = resolveSurfaceImageUrl(
    appearance.background_type ?? undefined,
    appearance.background_value,
  );
  if (imageUrl && appearance.background_type === 'gallery') {
    return surfaceImageBackgroundStyle(imageUrl);
  }

  return surfaceGradientStyle(appearance.cover_color);
}

export const DOCUMENT_SURFACE = {
  explorer: 'flex h-full min-h-0 flex-col border-white/40 bg-white/82 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-150',
  panel: 'rounded-2xl border border-white/55 bg-white/85 shadow-md backdrop-blur-lg',
  toolbar: 'border-b border-white/40 bg-white/75 backdrop-blur-md',
  chip: 'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
  rowSelected: 'bg-indigo-500/12 ring-1 ring-indigo-300/60',
  rowHover: 'hover:bg-white/60',
} as const;

export const FOLDER_PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
];

export const VAULT_GALLERY_IMAGES = [
  { id: 10, url: 'https://picsum.photos/id/10/1200/800', thumb: 'https://picsum.photos/id/10/400/300' },
  { id: 15, url: 'https://picsum.photos/id/15/1200/800', thumb: 'https://picsum.photos/id/15/400/300' },
  { id: 26, url: 'https://picsum.photos/id/26/1200/800', thumb: 'https://picsum.photos/id/26/400/300' },
  { id: 36, url: 'https://picsum.photos/id/36/1200/800', thumb: 'https://picsum.photos/id/36/400/300' },
  { id: 40, url: 'https://picsum.photos/id/40/1200/800', thumb: 'https://picsum.photos/id/40/400/300' },
  { id: 48, url: 'https://picsum.photos/id/48/1200/800', thumb: 'https://picsum.photos/id/48/400/300' },
  { id: 57, url: 'https://picsum.photos/id/57/1200/800', thumb: 'https://picsum.photos/id/57/400/300' },
  { id: 63, url: 'https://picsum.photos/id/63/1200/800', thumb: 'https://picsum.photos/id/63/400/300' },
];
