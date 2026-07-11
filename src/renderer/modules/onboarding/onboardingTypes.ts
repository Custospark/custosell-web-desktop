export const ONBOARDING_INTENT_IDS = [
  'sell_pos',
  'get_paid',
  'buy_supply',
  'win_deals',
  'run_projects',
  'people_payroll',
  'know_numbers',
  'explore',
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
}

export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'sell_pos',
    title: 'Sell every day',
    description: 'Counter sales, stock, and shifts — including offline',
  },
  {
    id: 'get_paid',
    title: 'Get paid',
    description: 'Customers, invoices, and payment receipts',
  },
  {
    id: 'buy_supply',
    title: 'Buy and supply',
    description: 'Marketplace, purchase orders, supplier invoices',
  },
  {
    id: 'win_deals',
    title: 'Win deals',
    description: 'Pipeline boards, leads, and follow-ups',
  },
  {
    id: 'run_projects',
    title: 'Run projects',
    description: 'Estimates, project boards, and delivery',
  },
  {
    id: 'people_payroll',
    title: 'People and payroll',
    description: 'Team, attendance, leave, and payroll',
  },
  {
    id: 'know_numbers',
    title: 'Know the numbers',
    description: 'Books, statements, and forecasting',
  },
  {
    id: 'explore',
    title: 'Not sure yet',
    description: 'Show me around — I’ll choose as I go',
  },
];

export type OnboardingAction =
  | { action: 'complete_intent'; primary_intent: OnboardingIntentId; secondary_intent?: OnboardingIntentId | null }
  | { action: 'skip_intent' }
  | { action: 'tour_step'; tour_step: number }
  | { action: 'complete_tour' }
  | { action: 'skip_tour' }
  | { action: 'replay_tour' };
