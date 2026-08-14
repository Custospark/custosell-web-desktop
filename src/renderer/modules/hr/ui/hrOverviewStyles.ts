import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { HrPayrollAffordabilityStatus } from '../api/hrTypes';
import { BarChart3, CalendarDays, ClipboardCheck, Clock, Users, Wallet } from 'lucide-react';

export const cardStyles = {
  blue: {
    border: 'border-blue-500',
    shadow: 'hover:shadow-blue-500/20',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    glow: 'bg-blue-500/10',
    hoverBg: 'group-hover:bg-blue-200',
  },
  green: {
    border: 'border-green-500',
    shadow: 'hover:shadow-green-500/20',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
    glow: 'bg-green-500/10',
    hoverBg: 'group-hover:bg-green-200',
  },
  amber: {
    border: 'border-amber-500',
    shadow: 'hover:shadow-amber-500/20',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    glow: 'bg-amber-500/10',
    hoverBg: 'group-hover:bg-amber-200',
  },
  purple: {
    border: 'border-purple-500',
    shadow: 'hover:shadow-purple-500/20',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    glow: 'bg-purple-500/10',
    hoverBg: 'group-hover:bg-purple-200',
  },
  indigo: {
    border: 'border-indigo-500',
    shadow: 'hover:shadow-indigo-500/20',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700',
    glow: 'bg-indigo-500/10',
    hoverBg: 'group-hover:bg-indigo-200',
  },
} as const;

export type CardColor = keyof typeof cardStyles;

export const runwayStyles: Record<HrPayrollAffordabilityStatus, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  tight: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  unknown: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

export const quickLinks = [
  { to: ROUTES.HR.PEOPLE, label: 'People', icon: Users },
  { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
  { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
  { to: ROUTES.HR.PAYROLL, label: 'Payroll', icon: Wallet },
  { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
  { to: ROUTES.HR.REPORTS, label: 'Reports', icon: BarChart3 },
] as const;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function countByStatus<T extends string>(items: { status: T }[], status: T) {
  return items.filter((item) => item.status === status).length;
}
