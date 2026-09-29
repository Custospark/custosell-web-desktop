import { Minus, Monitor, Package, PlugZap, Plus, Printer, Router, ScanBarcode, Wrench } from 'lucide-react';
import type { ComponentType } from 'react';

export interface QuotePackage {
  slug: string;
  name: string;
  trial_days: number;
  price_monthly_usd: number;
  price_yearly_usd: number | null;
  onboarding_fee_usd: number;
  maintenance_fee_ugx: number;
  currency: string;
  converted: { monthly: number; yearly: number | null; onboarding: number; maintenance: number } | null;
}

export interface CatalogItem {
  code: string;
  category: string;
  name: string;
  specs: string | null;
  price_ugx: number;
}

export interface QuoteTotals {
  hardware_lines: { code: string; category: string; name: string; specs: string | null; qty: number; line_total_ugx: number }[];
  hardware_total_ugx: number;
  custom_lines: { label: string; amount_ugx: number }[];
  custom_total_ugx: number;
  subscription_first_year_ugx: number;
  onboarding_ugx: number;
  maintenance_annual_ugx: number;
  discount_percent: number;
  discount_ugx: number;
  vat_percent: number;
  vat_ugx: number;
  grand_total_ugx: number;
  grand_total_usd: number;
  currency: string;
  currency_symbol: string;
  converted: { available: boolean; note: string; totals: Record<string, number>; lines: { code: string; unit: number; total: number }[]; customs: { label: string; amount: number }[] } | null;
  one_time_ugx: number;
  annual_recurring_ugx: number;
  usd_rate_note: string;
  operational_requirements: { area: string; requirement: string; provided_by: string }[];
}

export function LineIcon({ category }: { category: string }) {
  const icons: Record<string, ComponentType<{ className?: string }>> = {
    Computers: Monitor,
    Printers: Printer,
    Scanners: ScanBarcode,
    Accessories: Package,
    Power: PlugZap,
    Networking: Router,
    Services: Wrench,
  };
  const Icon = icons[category] ?? Package;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <Minus className="h-4 w-4" />
        </button>
        <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value || '0', 10))))}
          className="h-9 w-full min-w-0 rounded-lg border border-gray-200 px-2 text-center text-sm" />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}
