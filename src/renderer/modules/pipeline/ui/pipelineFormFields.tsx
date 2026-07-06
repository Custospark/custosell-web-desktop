/* eslint-disable react-refresh/only-export-components -- shared pipeline form utilities */
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export const pipelineLabelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
export const pipelineInputClass =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
export const pipelineSelectClass =
  'w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

interface PipelineFormSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function PipelineFormSection({ title, icon: Icon, children, className }: PipelineFormSectionProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm', className)}>
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <Icon className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

interface PipelineIconFieldProps {
  label: string;
  icon: LucideIcon;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function PipelineIconField({ label, icon: Icon, required, hint, children }: PipelineIconFieldProps) {
  return (
    <div>
      <label className={pipelineLabelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface PipelineModalHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'indigo' | 'emerald' | 'blue' | 'slate' | 'red';
}

const heroTones = {
  indigo: 'border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-950',
  emerald: 'border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950',
  blue: 'border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-950',
  slate: 'border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50 text-slate-950',
  red: 'border-red-100 bg-gradient-to-r from-red-50 to-rose-50 text-red-950',
};

const heroIconTones = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
  red: 'bg-red-100 text-red-600',
};

export function PipelineModalHero({ icon: Icon, title, description, tone = 'indigo' }: PipelineModalHeroProps) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3.5', heroTones[tone])}>
      <div className={cn('rounded-lg p-2.5 shadow-sm', heroIconTones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs opacity-80">{description}</p>
      </div>
    </div>
  );
}

export function pipelineInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
