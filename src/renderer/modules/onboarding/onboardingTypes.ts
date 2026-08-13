import type { ElementType } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Kanban,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  LineChart,
  Files,
  IdCard,
  Compass,
} from 'lucide-react';

export const ONBOARDING_INTENT_IDS = [
  'dashboard',
  'sales',
  'inventory',
  'customers',
  'pipeline',
  'estimates',
  'expenses',
  'documents',
  'hr',
  'accounting',
  'forecasting',
  'explore',
  // legacy aliases still accepted by API
  'sell_pos',
  'get_paid',
  'buy_supply',
  'win_deals',
  'run_projects',
  'people_payroll',
  'know_numbers',
] as const;

export type OnboardingIntentId = (typeof ONBOARDING_INTENT_IDS)[number];

export interface OnboardingState {
  is_owner: boolean;
  needs_intent: boolean;
  needs_tour: boolean;
  primary_intent: OnboardingIntentId | string | null;
  secondary_intent: OnboardingIntentId | string | null;
  intent_completed_at: string | null;
  intent_skipped_at: string | null;
  tour_step: number;
  tour_completed_at: string | null;
  tour_skipped_at: string | null;
}

export interface IntentOption {
  id: OnboardingIntentId;
  title: string;
  description: string;
  icon: ElementType;
  tone: string;
}

/** Intent cards aligned to Custosell modules (icons/tones match Apps launcher). */
export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'dashboard',
    title: 'See the big picture',
    description: 'Dashboard overview of how your business is doing',
    icon: LayoutDashboard,
    tone: 'bg-blue-50 text-blue-600 ring-blue-100',
  },
  {
    id: 'sales',
    title: 'Sell every day',
    description: 'POS, orders, history, refunds, and sales invoices',
    icon: ShoppingCart,
    tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
  {
    id: 'inventory',
    title: 'Stock & supply',
    description: 'Products, stock, marketplace, and purchase orders',
    icon: Package,
    tone: 'bg-amber-50 text-amber-600 ring-amber-100',
  },
  {
    id: 'customers',
    title: 'Know your customers',
    description: 'Customer list and relationships',
    icon: Users,
    tone: 'bg-sky-50 text-sky-600 ring-sky-100',
  },
  {
    id: 'pipeline',
    title: 'Win more deals',
    description: 'Boards, leads, and sales follow-ups',
    icon: Kanban,
    tone: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  },
  {
    id: 'estimates',
    title: 'Run projects',
    description: 'Estimates, project boards, and delivery',
    icon: FileSpreadsheet,
    tone: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
  {
    id: 'expenses',
    title: 'Track spending',
    description: 'Expense categories and day-to-day costs',
    icon: Receipt,
    tone: 'bg-orange-50 text-orange-600 ring-orange-100',
  },
  {
    id: 'documents',
    title: 'Organize files',
    description: 'Business documents, cabinets, and folders',
    icon: Files,
    tone: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
  {
    id: 'hr',
    title: 'People & payroll',
    description: 'Team, attendance, leave, and payroll',
    icon: IdCard,
    tone: 'bg-rose-50 text-rose-600 ring-rose-100',
  },
  {
    id: 'accounting',
    title: 'Keep the books',
    description: 'Chart of accounts, journals, and statements',
    icon: BookOpen,
    tone: 'bg-teal-50 text-teal-600 ring-teal-100',
  },
  {
    id: 'forecasting',
    title: 'Plan ahead',
    description: 'Cash outlook, budgets, KPIs, and scenarios',
    icon: LineChart,
    tone: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  },
  {
    id: 'explore',
    title: 'Show me everything',
    description: 'Take the tour — I’ll choose modules as I go',
    icon: Compass,
    tone: 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-100',
  },
];

export type OnboardingAction =
  | { action: 'complete_intent'; primary_intent: OnboardingIntentId; secondary_intent?: OnboardingIntentId | null }
  | { action: 'skip_intent' }
  | { action: 'dismiss_onboarding' }
  | { action: 'tour_step'; tour_step: number }
  | { action: 'complete_tour' }
  | { action: 'skip_tour' }
  | { action: 'replay_tour' };

