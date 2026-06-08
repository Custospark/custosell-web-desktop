export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export interface ValidationResult<T extends string = string> {
  valid: boolean;
  errors: FieldErrors<T>;
  firstError: string | null;
}

export function buildValidationResult<T extends string>(errors: FieldErrors<T>): ValidationResult<T> {
  const firstKey = Object.keys(errors)[0] as T | undefined;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstError: firstKey ? errors[firstKey] ?? null : null,
  };
}

export function required(value: string, message = 'This field is required'): string | null {
  return value.trim() ? null : message;
}

export function minLength(value: string, min: number, message?: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < min) {
    return message ?? `Must be at least ${min} characters`;
  }
  return null;
}

export function maxLength(value: string, max: number, message?: string): string | null {
  if (value.trim().length > max) {
    return message ?? `Must be at most ${max} characters`;
  }
  return null;
}

export function isValidDateString(value: string): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

export function validateDateRange(
  dateFrom: string,
  dateTo: string,
  options?: { maxDays?: number },
): ValidationResult<'dateFrom' | 'dateTo'> {
  const errors: FieldErrors<'dateFrom' | 'dateTo'> = {};

  if (!dateFrom) {
    errors.dateFrom = 'Start date is required';
  } else if (!isValidDateString(dateFrom)) {
    errors.dateFrom = 'Enter a valid start date';
  }

  if (!dateTo) {
    errors.dateTo = 'End date is required';
  } else if (!isValidDateString(dateTo)) {
    errors.dateTo = 'Enter a valid end date';
  }

  if (!errors.dateFrom && !errors.dateTo && dateFrom > dateTo) {
    errors.dateTo = 'End date must be on or after start date';
  }

  if (
    options?.maxDays
    && !errors.dateFrom
    && !errors.dateTo
    && isValidDateString(dateFrom)
    && isValidDateString(dateTo)
  ) {
    const fromMs = Date.parse(dateFrom);
    const toMs = Date.parse(dateTo);
    const spanDays = Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)) + 1;
    if (spanDays > options.maxDays) {
      errors.dateTo = `Date range cannot exceed ${options.maxDays} days`;
    }
  }

  return buildValidationResult(errors);
}
