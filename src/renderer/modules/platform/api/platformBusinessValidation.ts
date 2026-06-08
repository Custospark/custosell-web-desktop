import {
  buildValidationResult,
  maxLength,
  minLength,
  required,
  validateDateRange,
  type FieldErrors,
  type ValidationResult,
} from '../../../shared/utils/formValidation';
import type { PlatformBusiness } from './PlatformTypes';

export const BUSINESS_STATUS_REASON_MIN = 3;
export const BUSINESS_STATUS_REASON_MAX = 1000;
export const BUSINESS_STATS_MAX_RANGE_DAYS = 366;

export type BusinessStatusReasonField = 'reason';
export type BusinessDateRangeField = 'dateFrom' | 'dateTo';

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

export function validateBusinessStatsDateRange(
  dateFrom: string,
  dateTo: string,
): ValidationResult<BusinessDateRangeField> {
  return validateDateRange(dateFrom, dateTo, { maxDays: BUSINESS_STATS_MAX_RANGE_DAYS });
}

export function getBusinessNextStatus(
  business: PlatformBusiness,
): 'active' | 'suspended' | null {
  if (business.status === 'active') return 'suspended';
  if (business.status === 'suspended') return 'active';
  return null;
}

export function canChangeBusinessStatus(business: PlatformBusiness): boolean {
  return getBusinessNextStatus(business) !== null;
}

export function assertBusinessStatusReason(reason: string): string {
  const result = validateBusinessStatusReason(reason);
  if (!result.valid) {
    throw new Error(result.firstError ?? 'Invalid reason');
  }
  return reason.trim();
}
