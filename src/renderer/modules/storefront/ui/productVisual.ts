import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Coffee,
  Cpu,
  Droplets,
  Leaf,
  Package,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wheat,
  Wrench,
} from 'lucide-react';

type Visual = { Icon: LucideIcon; wrap: string; icon: string };

/**
 * Pick a lively icon + color from product name / type - avoids generic cube everywhere.
 */
export function productVisual(name: string, type?: string | null): Visual {
  const hay = `${name} ${type ?? ''}`.toLowerCase();

  if (/\b(software|saas|app|code|dev|it |digital|license)\b/.test(hay) || type === 'service' && /soft|dev|consult/.test(hay)) {
    return { Icon: Cpu, wrap: 'bg-violet-100', icon: 'text-violet-700' };
  }
  if (/\b(service|consult|repair|install|labour|labor)\b/.test(hay) || type === 'service') {
    return { Icon: Briefcase, wrap: 'bg-sky-100', icon: 'text-sky-700' };
  }
  if (/\b(flour|wheat|maize|cassava|sorghum|teff|grain|rice|meal)\b/.test(hay)) {
    return { Icon: Wheat, wrap: 'bg-amber-100', icon: 'text-amber-800' };
  }
  if (/\b(oil|water|juice|drink|milk|soda|beverage)\b/.test(hay)) {
    return { Icon: Droplets, wrap: 'bg-cyan-100', icon: 'text-cyan-700' };
  }
  if (/\b(coffee|tea|spice|herb|leaf)\b/.test(hay)) {
    return { Icon: Coffee, wrap: 'bg-orange-100', icon: 'text-orange-800' };
  }
  if (/\b(veg|fruit|fresh|organic|green)\b/.test(hay)) {
    return { Icon: Leaf, wrap: 'bg-emerald-100', icon: 'text-emerald-700' };
  }
  if (/\b(food|meal|snack|bread|sauce)\b/.test(hay)) {
    return { Icon: Utensils, wrap: 'bg-rose-100', icon: 'text-rose-700' };
  }
  if (/\b(tool|hardware|part|spare)\b/.test(hay)) {
    return { Icon: Wrench, wrap: 'bg-slate-200', icon: 'text-slate-700' };
  }
  if (/\b(gift|premium|special)\b/.test(hay)) {
    return { Icon: Sparkles, wrap: 'bg-fuchsia-100', icon: 'text-fuchsia-700' };
  }
  if (/\b(shop|retail|store)\b/.test(hay)) {
    return { Icon: ShoppingBag, wrap: 'bg-indigo-100', icon: 'text-indigo-800' };
  }
  return { Icon: Package, wrap: 'bg-indigo-50', icon: 'text-indigo-700' };
}

export function shopVisual(name: string): Visual {
  const hay = name.toLowerCase();
  if (/\b(restau|cafe|food|kitchen|grill)\b/.test(hay)) {
    return { Icon: Utensils, wrap: 'bg-rose-100', icon: 'text-rose-700' };
  }
  if (/\b(tech|soft|digital|it)\b/.test(hay)) {
    return { Icon: Cpu, wrap: 'bg-violet-100', icon: 'text-violet-700' };
  }
  if (/\b(farm|agro|grain|mill)\b/.test(hay)) {
    return { Icon: Wheat, wrap: 'bg-amber-100', icon: 'text-amber-800' };
  }
  return { Icon: ShoppingBag, wrap: 'bg-indigo-100', icon: 'text-indigo-800' };
}
