import type { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extract a user-friendly message from an API error.
 * Prefers validation field errors (Laravel ValidationException shape), falls
 * back to the top-level message, then a generic fallback.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const error = err as AxiosError<ApiErrorBody> | undefined;
  const body = error?.response?.data;

  if (body?.errors) {
    const first = Object.values(body.errors).flat().find((msg) => typeof msg === 'string' && msg.length > 0);
    if (first) return first;
  }

  if (body?.message && body.message.trim()) return body.message;

  if (error?.message && !error.message.startsWith('Request failed with status code')) {
    return error.message;
  }

  return fallback;
}
