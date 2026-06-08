import {
  differenceInDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
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
  PlatformUser,
  PlatformUserStats,
  UserAccountStatus,
  UserLoginActivity,
  UserNotificationIntention,
} from './PlatformTypes';

export const USER_STATUS_REASON_MIN = 3;
export const USER_STATUS_REASON_MAX = 1000;
export const USER_NOTIFY_MESSAGE_MAX = 5000;
export const USER_NOTIFY_SUBJECT_MAX = 200;
export const USER_STATS_MAX_RANGE_DAYS = 366;

export const USER_ACCOUNT_STATUSES: UserAccountStatus[] = ['active', 'warning', 'notified', 'restricted', 'deactivated'];

export const STATUS_DURATION_DAYS = [7, 30, 60, 90] as const;

export const USER_STATUS_LABELS: Record<UserAccountStatus, string> = {
  active: 'Active',
  warning: 'Warning',
  notified: 'Notified',
  restricted: 'Restricted',
  deactivated: 'Deactivated',
};

export const LOGIN_ACTIVITY_LABELS: Record<UserLoginActivity, string> = {
  active: 'Active',
  dormant: 'Dormant',
  churned: 'Churned',
  never_logged_in: 'Never logged in',
};

export const USER_NOTIFICATION_INTENTIONS: { value: UserNotificationIntention; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'warning_notice', label: 'Warning notice' },
  { value: 'policy_update', label: 'Policy update' },
  { value: 'reactivation_nudge', label: 'Reactivation nudge' },
  { value: 'account_notice', label: 'Account notice' },
  { value: 'custom', label: 'Custom message' },
];

export type UserStatusReasonField = 'reason';
export type UserDateRangeField = 'dateFrom' | 'dateTo';
export type UserNotifyField = 'message' | 'subject';

const ACTIVE_LOGIN_DAYS = 30;
const DORMANT_LOGIN_DAYS = 90;

export function resolveUserStatus(user: PlatformUser): UserAccountStatus {
  if (user.status) return user.status;
  return user.is_active ? 'active' : 'deactivated';
}

export function resolveUserLoginActivity(user: PlatformUser): UserLoginActivity {
  if (!user.last_login_at) return 'never_logged_in';

  let days = user.days_since_login;
  if (days === null || days === undefined) {
    const parsed = parseISO(user.last_login_at);
    if (!isValid(parsed)) return 'never_logged_in';
    days = differenceInDays(new Date(), parsed);
  }

  if (days <= ACTIVE_LOGIN_DAYS) return 'active';
  if (days <= DORMANT_LOGIN_DAYS) return 'dormant';
  return 'churned';
}

export function formatUserLoginRecency(user: PlatformUser): string {
  const activity = resolveUserLoginActivity(user);
  if (activity === 'never_logged_in') return 'No login recorded';

  let days = user.days_since_login;
  if ((days === null || days === undefined) && user.last_login_at) {
    const parsed = parseISO(user.last_login_at);
    if (isValid(parsed)) days = differenceInDays(new Date(), parsed);
  }

  if (days === null || days === undefined) return 'No login recorded';
  if (days === 0) return 'Logged in today';
  if (days === 1) return 'Logged in yesterday';
  return `Last login ${days}d ago`;
}

export function validateUserStatusReason(reason: string): ValidationResult<UserStatusReasonField> {
  const errors: FieldErrors<UserStatusReasonField> = {};

  const requiredError = required(reason, 'Reason is required');
  if (requiredError) {
    errors.reason = requiredError;
  } else {
    const minError = minLength(reason, USER_STATUS_REASON_MIN, `Reason must be at least ${USER_STATUS_REASON_MIN} characters`);
    const maxError = maxLength(reason, USER_STATUS_REASON_MAX, `Reason must be at most ${USER_STATUS_REASON_MAX} characters`);
    if (minError) errors.reason = minError;
    else if (maxError) errors.reason = maxError;
  }

  return buildValidationResult(errors);
}

export function validateUserNotifyMessage(
  message: string,
  subject = '',
): ValidationResult<UserNotifyField> {
  const errors: FieldErrors<UserNotifyField> = {};

  const messageError = required(message, 'Message is required')
    ?? minLength(message, USER_STATUS_REASON_MIN, `Message must be at least ${USER_STATUS_REASON_MIN} characters`)
    ?? maxLength(message, USER_NOTIFY_MESSAGE_MAX, `Message must be at most ${USER_NOTIFY_MESSAGE_MAX} characters`);
  if (messageError) errors.message = messageError;

  if (subject.trim()) {
    const subjectError = maxLength(subject, USER_NOTIFY_SUBJECT_MAX, `Subject must be at most ${USER_NOTIFY_SUBJECT_MAX} characters`);
    if (subjectError) errors.subject = subjectError;
  }

  return buildValidationResult(errors);
}

export function validateUserStatsDateRange(
  dateFrom: string,
  dateTo: string,
): ValidationResult<UserDateRangeField> {
  return validateDateRange(dateFrom, dateTo, { maxDays: USER_STATS_MAX_RANGE_DAYS });
}

export function assertUserStatusReason(reason: string): string {
  const result = validateUserStatusReason(reason);
  if (!result.valid) throw new Error(result.firstError ?? 'Invalid reason');
  return reason.trim();
}

/** Parse comma/newline-separated emails for bulk platform role assignment. */
export function parseUserEmails(raw: string): string[] {
  return [...new Set(
    raw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@')),
  )];
}

export function assertUserNotifyPayload(message: string, subject = ''): { message: string; subject: string | undefined } {
  const result = validateUserNotifyMessage(message, subject);
  if (!result.valid) throw new Error(result.firstError ?? 'Invalid message');
  const trimmedSubject = subject.trim();
  return { message: message.trim(), subject: trimmedSubject || undefined };
}

export function matchesStatusDurationFilter(
  user: PlatformUser,
  statusFilter: UserAccountStatus | '',
  durationDays: number | '',
): boolean {
  if (!statusFilter || !durationDays) return true;
  if (resolveUserStatus(user) !== statusFilter) return false;
  if (!user.status_changed_at) return false;
  const daysInStatus = differenceInDays(new Date(), parseISO(user.status_changed_at));
  return daysInStatus >= durationDays;
}

export function userAccountStatusBadge(status: UserAccountStatus): 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'active') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'notified') return 'primary';
  return 'danger';
}

export const loginActivityBadge: Record<UserLoginActivity, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  dormant: 'warning',
  churned: 'danger',
  never_logged_in: 'neutral',
};

function parseUserDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parsed = parseISO(iso);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function buildUserDecisionInsights(users: PlatformUser[]): string[] {
  const notes: string[] = [];
  let dormant = 0;
  let churned = 0;
  let neverLoggedIn = 0;
  let deactivated = 0;
  let noBusiness = 0;

  for (const user of users) {
    const activity = resolveUserLoginActivity(user);
    if (activity === 'dormant') dormant++;
    else if (activity === 'churned') churned++;
    else if (activity === 'never_logged_in') neverLoggedIn++;
    if (resolveUserStatus(user) === 'deactivated') deactivated++;
    if (!user.business_id && !user.is_platform_admin) noBusiness++;
  }

  if (churned > 0) {
    notes.push(`${churned} user${churned === 1 ? '' : 's'} have not signed in for 90+ days — consider a reactivation nudge.`);
  }
  if (dormant > 0) {
    notes.push(`${dormant} dormant user${dormant === 1 ? '' : 's'} (31–90d since login) may need engagement before they churn.`);
  }
  if (neverLoggedIn > 0) {
    notes.push(`${neverLoggedIn} account${neverLoggedIn === 1 ? '' : 's'} never logged in — prioritize onboarding or verify invite delivery.`);
  }
  if (deactivated > 0) {
    notes.push(`${deactivated} deactivated account${deactivated === 1 ? '' : 's'} in the loaded set — review before bulk outreach.`);
  }
  if (noBusiness > 0) {
    notes.push(`${noBusiness} user${noBusiness === 1 ? '' : 's'} without a linked business — may be incomplete sign-ups.`);
  }
  if (notes.length === 0) {
    notes.push('No urgent login or account-status patterns in the loaded user sample.');
  }

  return notes;
}

/** Client-side stats from the paginated users list when GET /platform/users/stats is unavailable. */
export function computePlatformUserStatsFromList(
  users: PlatformUser[],
  dateFrom: string,
  dateTo: string,
): PlatformUserStats {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const rangeStart = startOfDay(parseISO(dateFrom));
  const rangeEnd = startOfDay(parseISO(dateTo));

  let joinedToday = 0;
  let joinedThisWeek = 0;
  let joinedThisMonth = 0;
  let inRange = 0;

  const totals: PlatformUserStats['totals'] = {
    total: users.length,
    active: 0,
    warning: 0,
    notified: 0,
    restricted: 0,
    deactivated: 0,
    with_business: 0,
    platform_admins: 0,
    logins_30d: 0,
  };

  const dailySignups = new Map<string, number>();
  let cumulativeBeforeRange = 0;

  for (const user of users) {
    const created = parseUserDate(user.created_at);
    if (created) {
      if (isSameDay(created, today)) joinedToday++;
      if (created >= weekStart) joinedThisWeek++;
      if (created >= monthStart) joinedThisMonth++;
      if (created >= rangeStart && created <= rangeEnd) inRange++;
      if (created < rangeStart) cumulativeBeforeRange++;

      const key = format(created, 'yyyy-MM-dd');
      dailySignups.set(key, (dailySignups.get(key) ?? 0) + 1);
    }

    const status = resolveUserStatus(user);
    if (status === 'active') totals.active++;
    else if (status === 'warning') totals.warning++;
    else if (status === 'notified') totals.notified++;
    else if (status === 'restricted') totals.restricted++;
    else if (status === 'deactivated') totals.deactivated++;

    if (user.business_id) totals.with_business++;
    if (user.is_platform_admin) totals.platform_admins++;
    if (resolveUserLoginActivity(user) === 'active') totals.logins_30d++;
  }

  const rangeDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  let cumulative = cumulativeBeforeRange;
  const growth = rangeDays.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const signups = dailySignups.get(key) ?? 0;
    cumulative += signups;
    return { date: key, signups, cumulative };
  });

  return {
    onboarding: {
      today: joinedToday,
      this_week: joinedThisWeek,
      this_month: joinedThisMonth,
      in_range: inRange,
      range_from: dateFrom,
      range_to: dateTo,
    },
    totals,
    growth,
    decisions: buildUserDecisionInsights(users),
  };
}
