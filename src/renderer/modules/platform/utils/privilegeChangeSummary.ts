import type {
  PlatformAccountType,
  PlatformPrivilegesPayload,
  PlatformSubscriptionStatus,
  PlatformUser,
} from '../api/PlatformTypes';

export type SubscriptionDateField =
  | 'trial_ends_at'
  | 'next_billing_date'
  | 'grace_period_ends_at'
  | 'suspended_at'
  | 'ends_at';

export const DATE_FIELD_BY_STATUS: Record<PlatformSubscriptionStatus, SubscriptionDateField> = {
  trial: 'trial_ends_at',
  active: 'next_billing_date',
  past_due: 'grace_period_ends_at',
  suspended: 'suspended_at',
  cancelled: 'ends_at',
  expired: 'ends_at',
};

export const DATE_FIELD_LABELS: Record<SubscriptionDateField, string> = {
  trial_ends_at: 'Trial ends at',
  next_billing_date: 'Next billing date',
  grace_period_ends_at: 'Grace period ends',
  suspended_at: 'Suspended at',
  ends_at: 'Ends at',
};

export const ACCOUNT_TYPE_LABELS: Record<PlatformAccountType, string> = {
  business: 'Business',
  personal: 'Personal',
  storefront_buyer: 'Storefront buyer',
};

export const STATUS_LABELS: Record<PlatformSubscriptionStatus, string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** The date column an admin is effectively editing, given the selection. */
export function resolveSubscriptionDateField(
  selectedStatus: PlatformSubscriptionStatus | '',
  currentStatus: PlatformSubscriptionStatus | undefined,
): SubscriptionDateField {
  const status = selectedStatus || currentStatus || 'active';
  return DATE_FIELD_BY_STATUS[status];
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function fmtPaid(value: boolean | undefined): string {
  return value === undefined ? '-' : value ? 'paid' : 'unpaid';
}

function planLabel(planId: number | '', plans: Array<{ id: number; name: string }>): string {
  if (planId === '') return '-';
  return plans.find((p) => p.id === Number(planId))?.name ?? `Plan #${planId}`;
}

export interface PrivilegeChangeRow {
  label: string;
  from: string;
  to: string;
  sensitive?: boolean;
}

/**
 * Build an ordered "before → after" summary of every field the admin is about
 * to change. Password is shown only as "will be set" - the stored hash cannot
 * be read back, so there is no meaningful 'from' value.
 */
export function buildPrivilegeChangeRows(
  payload: PlatformPrivilegesPayload,
  single: PlatformUser | null,
  plans: Array<{ id: number; name: string }>,
): PrivilegeChangeRow[] {
  const rows: PrivilegeChangeRow[] = [];
  const sub = single?.subscription;
  const currentStatus = sub?.status;

  if (payload.account_type) {
    rows.push({
      label: 'Account type',
      from: single?.account_type ? ACCOUNT_TYPE_LABELS[single.account_type] : '-',
      to: ACCOUNT_TYPE_LABELS[payload.account_type],
    });
  }

  if (payload.email) {
    rows.push({ label: 'Email', from: single?.email ?? '-', to: payload.email });
  }

  if (payload.password) {
    rows.push({ label: 'Password', from: '•••••••• (not readable)', to: 'Will be replaced', sensitive: true });
  }

  if (payload.plan_id !== undefined) {
    rows.push({
      label: 'Plan',
      from: sub?.plan_name ?? 'No plan',
      to: planLabel(payload.plan_id, plans),
    });
  }

  if (payload.billing_cycle) {
    rows.push({
      label: 'Billing cycle',
      from: sub?.billing_cycle ?? '-',
      to: payload.billing_cycle,
    });
  }

  if (payload.subscription_status) {
    rows.push({
      label: 'Subscription status',
      from: currentStatus ? STATUS_LABELS[currentStatus] : '-',
      to: STATUS_LABELS[payload.subscription_status],
    });
  }

  if (payload.onboarding_fee_paid !== undefined) {
    rows.push({
      label: 'Onboarding fee',
      from: fmtPaid(sub?.onboarding_fee_paid),
      to: payload.onboarding_fee_paid ? 'paid' : 'unpaid',
    });
  }

  const dateField = resolveSubscriptionDateField(payload.subscription_status ?? '', currentStatus);
  const changedDate = payload[dateField];
  if (changedDate) {
    rows.push({
      label: DATE_FIELD_LABELS[dateField],
      from: fmtDate(sub?.[dateField] as string | null | undefined),
      to: new Date(changedDate).toLocaleDateString(),
    });
  }

  return rows;
}