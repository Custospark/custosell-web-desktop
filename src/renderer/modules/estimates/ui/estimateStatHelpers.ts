export const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', glow: 'bg-blue-500/10' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', glow: 'bg-green-500/10' },
  purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', glow: 'bg-purple-500/10' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', glow: 'bg-amber-500/10' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', glow: 'bg-indigo-500/10' },
} as const;

export type StatColor = keyof typeof cardStyles;

export const toNumber = (v: unknown): number => Number(v) || 0;
