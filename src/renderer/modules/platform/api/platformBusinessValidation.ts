import { differenceInDays, parseISO, isValid } from 'date-fns';
import {
  buildValidationResult,
  maxLength,
  minLength,
  required,
  validateDateRange,
  type FieldErrors,
  type ValidationResult,
} from '../../../shared/utils/formValidation';
import type {
  ActivityStatus,
  BusinessAccountStatus,
  BusinessNotificationIntention,
  PlatformBusiness,
} from './PlatformTypes';

export const BUSINESS_STATUS_REASON_MIN = 3;
export const BUSINESS_STATUS_REASON_MAX = 1000;
export const BUSINESS_NOTIFY_MESSAGE_MAX = 5000;
export const BUSINESS_NOTIFY_SUBJECT_MAX = 200;
export const BUSINESS_STATS_MAX_RANGE_DAYS = 366;

export const BUSINESS_ACCOUNT_STATUSES: BusinessAccountStatus[] = ['active', 'warning', 'notified', 'restricted', 'suspended'];

export const STATUS_DURATION_DAYS = [7, 30, 60, 90] as const;

export const ACTIVITY_STATUS_LABELS: Record<import('./PlatformTypes').ActivityStatus, string> = {
  active: 'Active',
  dormant: 'Dormant',
  churned: 'Churned',
  never_used: 'Never used',
  suspended: 'Suspended',
};

export function formatDaysSinceActivity(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return 'No activity recorded';
  }
  if (days === 0) return 'Last active today';
  if (days === 1) return 'Last active yesterday';
  return `Last active ${days}d ago`;
}

export function formatBusinessActivityRecency(business: PlatformBusiness): string {
  if (business.days_since_activity !== null && business.days_since_activity !== undefined) {
    return formatDaysSinceActivity(business.days_since_activity);
  }
  if (business.last_activity_at) {
    const parsed = parseISO(business.last_activity_at);
    if (isValid(parsed)) {
      return formatDaysSinceActivity(differenceInDays(new Date(), parsed));
    }
  }
  return 'No activity recorded';
}

/** Re-derive activity label when persisted cache predates API activity fields. */
export function resolveDisplayActivityStatus(business: PlatformBusiness): ActivityStatus {
  if (
    business.activity_status
    && business.activity_status !== 'never_used'
    && business.days_since_activity !== undefined
  ) {
    return business.activity_status;
  }

  const activeDays = business.activity_active_days ?? 30;
  const dormantDays = business.activity_dormant_days ?? 90;

  let days: number | null = business.days_since_activity ?? null;
  if (days === null && business.last_activity_at) {
    const parsed = parseISO(business.last_activity_at);
    if (isValid(parsed)) {
      days = differenceInDays(new Date(), parsed);
    }
  }

  if (days === null) {
    const hasGross = parseFloat(business.gross_sales_all_time || '0') > 0
      || business.transactions_30d > 0;
    return hasGross ? 'active' : (business.activity_status ?? 'never_used');
  }

  if (days <= activeDays) return 'active';
  if (days <= dormantDays) return 'dormant';
  return 'churned';
}

export const NOTIFICATION_INTENTIONS: { value: BusinessNotificationIntention; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'warning_notice', label: 'Warning notice' },
  { value: 'payment_reminder', label: 'Payment reminder' },
  { value: 'policy_update', label: 'Policy update' },
  { value: 'reactivation_nudge', label: 'Reactivation nudge' },
  { value: 'custom', label: 'Custom message' },
];

export const STATUS_LABELS: Record<BusinessAccountStatus, string> = {
  active: 'Active',
  warning: 'Warning',
  notified: 'Notified',
  restricted: 'Restricted',
  suspended: 'Suspended',
};

export type BusinessStatusReasonField = 'reason';
export type BusinessDateRangeField = 'dateFrom' | 'dateTo';
export type BusinessNotifyField = 'message' | 'subject';

export function validateBusinessStatusReason(reason: string): ValidationResult<BusinessStatusReasonField> {
  const errors: FieldErrors<BusinessStatusReasonField> = {};

  const requiredError = required(reason, 'Reason is required');
  if (requiredError) {
    errors.reason = requiredError;
  } else {
    const minError = minLength(reason, BUSINESS_STATUS_REASON_MIN, `Reason must be at least ${BUSINESS_STATUS_REASON_MIN} characters`);
    const maxError = maxLength(reason, BUSINESS_STATUS_REASON_MAX, `Reason must be at most ${BUSINESS_STATUS_REASON_MAX} characters`);
    if (minError) errors.reason = minError;
    else if (maxError) errors.reason = maxError;
  }

  return buildValidationResult(errors);
}

export function validateBusinessNotifyMessage(
  message: string,
  subject = '',
): ValidationResult<BusinessNotifyField> {
  const errors: FieldErrors<BusinessNotifyField> = {};

  const messageError = required(message, 'Message is required')
    ?? minLength(message, BUSINESS_STATUS_REASON_MIN, `Message must be at least ${BUSINESS_STATUS_REASON_MIN} characters`)
    ?? maxLength(message, BUSINESS_NOTIFY_MESSAGE_MAX, `Message must be at most ${BUSINESS_NOTIFY_MESSAGE_MAX} characters`);
  if (messageError) errors.message = messageError;

  if (subject.trim()) {
    const subjectError = maxLength(subject, BUSINESS_NOTIFY_SUBJECT_MAX, `Subject must be at most ${BUSINESS_NOTIFY_SUBJECT_MAX} characters`);
    if (subjectError) errors.subject = subjectError;
  }

  return buildValidationResult(errors);
}

export function validateBusinessStatsDateRange(
  dateFrom: string,
  dateTo: string,
): ValidationResult<BusinessDateRangeField> {
  return validateDateRange(dateFrom, dateTo, { maxDays: BUSINESS_STATS_MAX_RANGE_DAYS });
}

export function getSelectableStatuses(current: BusinessAccountStatus): BusinessAccountStatus[] {
  return BUSINESS_ACCOUNT_STATUSES.filter((s) => s !== current);
}

/** @deprecated Use getSelectableStatuses — kept for hot-reload compatibility */
export function getBusinessNextStatus(business: PlatformBusiness): BusinessAccountStatus | null {
  return getSelectableStatuses(business.status)[0] ?? null;
}

export function canChangeBusinessStatus(business: PlatformBusiness): boolean {
  return getSelectableStatuses(business.status).length > 0;
}

export function assertBusinessStatusReason(reason: string): string {
  const result = validateBusinessStatusReason(reason);
  if (!result.valid) {
    throw new Error(result.firstError ?? 'Invalid reason');
  }
  return reason.trim();
}

export function assertBusinessNotifyPayload(message: string, subject = ''): { message: string; subject: string | undefined } {
  const result = validateBusinessNotifyMessage(message, subject);
  if (!result.valid) {
    throw new Error(result.firstError ?? 'Invalid message');
  }
  const trimmedSubject = subject.trim();
  return {
    message: message.trim(),
    subject: trimmedSubject || undefined,
  };
}

export function matchesStatusDurationFilter(
  business: PlatformBusiness,
  statusFilter: BusinessAccountStatus | '',
  durationDays: number | '',
): boolean {
  if (!statusFilter || !durationDays) return true;
  if (business.status !== statusFilter) return false;
  if (!business.status_changed_at) return false;
  const daysInStatus = differenceInDays(new Date(), parseISO(business.status_changed_at));
  return daysInStatus >= durationDays;
}

export function accountStatusBadge(status: BusinessAccountStatus): 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'active') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'notified') return 'primary';
  return 'danger';
}
