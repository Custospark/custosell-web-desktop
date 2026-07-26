import type { Plan } from '../../shared/types';
import type { SubscriptionInfo } from '../../app/store/slices/authSlice';

export type PlanActionType =
  | 'subscribe'
  | 'resubscribe'
  | 'reactivate'
  | 'upgrade'
  | 'downgrade'
  | 'current'
  | 'pay_onboarding'
  | 'renew';

export interface PlanAction {
  type: PlanActionType;
  label: string;
  requiresPayment: boolean;
}

type StatusKey = 'none' | 'trial_paid' | 'trial_unpaid' | 'active' | 'past_due' | 'suspended' | 'expired' | 'cancelled';
type Relation = 'current' | 'higher' | 'lower';

type Matrix = Record<StatusKey, Record<Relation, PlanAction>>;

const MATRIX: Matrix = {
  none: {
    current: { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
    higher:  { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
    lower:   { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
  },
  trial_paid: {
    current: { type: 'current', label: 'Current Plan', requiresPayment: false },
    higher:  { type: 'upgrade', label: 'Upgrade', requiresPayment: true },
    lower:   { type: 'current', label: 'Current Plan', requiresPayment: false },
  },
  trial_unpaid: {
    current: { type: 'pay_onboarding', label: 'Pay Setup Fee', requiresPayment: true },
    higher:  { type: 'upgrade', label: 'Upgrade', requiresPayment: true },
    lower:   { type: 'current', label: 'Current Plan', requiresPayment: false },
  },
  active: {
    current: { type: 'current', label: 'Current Plan', requiresPayment: false },
    higher:  { type: 'upgrade', label: 'Upgrade', requiresPayment: true },
    lower:   { type: 'downgrade', label: 'Downgrade', requiresPayment: false },
  },
  past_due: {
    current: { type: 'renew', label: 'Pay Outstanding', requiresPayment: true },
    higher:  { type: 'upgrade', label: 'Upgrade', requiresPayment: true },
    lower:   { type: 'downgrade', label: 'Downgrade', requiresPayment: false },
  },
  suspended: {
    current: { type: 'reactivate', label: 'Reactivate', requiresPayment: true },
    higher:  { type: 'reactivate', label: 'Reactivate', requiresPayment: true },
    lower:   { type: 'reactivate', label: 'Reactivate', requiresPayment: true },
  },
  expired: {
    current: { type: 'resubscribe', label: 'Re-subscribe', requiresPayment: true },
    higher:  { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
    lower:   { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
  },
  cancelled: {
    current: { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
    higher:  { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
    lower:   { type: 'subscribe', label: 'Subscribe', requiresPayment: true },
  },
};

function resolveStatusKey(subscription: SubscriptionInfo | undefined): StatusKey {
  if (!subscription) return 'none';
  if (!subscription.onboarding_fee_paid) return 'trial_unpaid';
  if (subscription.status === 'trial' || subscription.status === 'trialing') return 'trial_paid';
  if (subscription.status === 'active') return 'active';
  if (subscription.status === 'past_due') return 'past_due';
  if (subscription.status === 'suspended') return 'suspended';
  if (subscription.status === 'expired') return 'expired';
  if (subscription.status === 'cancelled') return 'cancelled';
  return 'none';
}

function resolveRelation(plan: Plan, subscription: SubscriptionInfo | undefined, currentSortOrder: number): Relation {
  if (!subscription) return 'current';
  if (plan.id === subscription.plan_id) return 'current';
  if (plan.sort_order > currentSortOrder) return 'higher';
  return 'lower';
}

export function getPlanAction(
  plan: Plan,
  subscription: SubscriptionInfo | undefined,
  currentPlanSortOrder: number,
): PlanAction {
  const statusKey = resolveStatusKey(subscription);
  const relation = resolveRelation(plan, subscription, currentPlanSortOrder);
  return MATRIX[statusKey][relation];
}

export function getPaymentType(actionType: PlanActionType): string {
  switch (actionType) {
    case 'pay_onboarding': return 'onboarding';
    case 'renew': return 'renewal';
    case 'upgrade': return 'upgrade_proration';
    default: return 'subscription';
  }
}
