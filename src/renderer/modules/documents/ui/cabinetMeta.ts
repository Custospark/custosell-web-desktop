import { Lock, Users, UserRound } from 'lucide-react';
import type { CabinetVisibility } from '../api/documentTypes';

export const CABINET_VISIBILITY_META: Record<
  CabinetVisibility,
  { label: string; icon: typeof Users; className: string }
> = {
  all_staff: { label: 'Everyone', icon: Users, className: 'bg-blue-50 text-blue-700' },
  owner_only: { label: 'Only me', icon: Lock, className: 'bg-gray-100 text-gray-700' },
  selected_staff: { label: 'Selected people', icon: UserRound, className: 'bg-violet-50 text-violet-700' },
};

export const CABINET_ACCESS_OPTIONS: {
  value: CabinetVisibility;
  label: string;
  hint: string;
}[] = [
  { value: 'all_staff', label: 'Everyone on the team', hint: 'All staff with Documents can open this cabinet' },
  { value: 'selected_staff', label: 'Specific people', hint: 'Choose who can view, add, or manage' },
  { value: 'owner_only', label: 'Only me', hint: 'Visible only to you' },
];

export function cabinetCardHeroStyle(cabinet: {
  cover_color?: string | null;
  background_type?: string | null;
  background_value?: string | null;
}) {
  const accent = cabinet.cover_color ?? '#6366f1';
  if (cabinet.background_type === 'gallery' && cabinet.background_value) {
    return {
      backgroundColor: accent,
      backgroundImage: `linear-gradient(135deg, ${accent}88 0%, rgba(15,23,42,0.55) 100%), url(${cabinet.background_value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } as const;
  }
  if (cabinet.background_type === 'color' && cabinet.background_value) {
    return {
      background: `linear-gradient(135deg, ${accent} 0%, ${cabinet.background_value} 100%)`,
    } as const;
  }
  return {
    background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 45%, #1e293b 100%)`,
  } as const;
}

export function cabinetColorAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
