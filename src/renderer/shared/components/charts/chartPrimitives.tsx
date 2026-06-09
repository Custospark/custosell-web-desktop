import { type ReactNode } from 'react';

export const CHART_THEME = {
  line: '#2563eb',
  lineLight: '#93c5fd',
  fillStart: 'rgba(37, 99, 235, 0.22)',
  fillEnd: 'rgba(37, 99, 235, 0.02)',
  grid: '#eef2f7',
  reference: '#94a3b8',
  deductions: '#ef4444',
  transactions: '#10b981',
} as const;

export function formatAxisCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(Math.round(value));
}

export function chartAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ChartTooltipShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-900 mb-0.5 truncate">{title}</p>
      {subtitle && <p className="text-gray-500 mb-2">{subtitle}</p>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function ChartTooltipRow({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${accent ? 'text-blue-700' : muted ? 'text-red-600' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
