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

export type OnboardingAction =
  | { action: 'complete_intent'; primary_intent: OnboardingIntentId; secondary_intent?: OnboardingIntentId | null }
  | { action: 'skip_intent' }
  | { action: 'dismiss_onboarding' }
  | { action: 'tour_step'; tour_step: number }
  | { action: 'complete_tour' }
  | { action: 'skip_tour' }
  | { action: 'replay_tour' };

