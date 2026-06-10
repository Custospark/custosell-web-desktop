import type { AxiosError } from 'axios';

export class AuthSyncPauseError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthSyncPauseError';
  }
}

export function isAuthHttpError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401 || status === 403;
}

export function isValidationHttpError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 408 && status !== 429;
}

export function isNetworkOrServerError(error: unknown): boolean {
  const err = error as AxiosError;
  const status = err.response?.status;
  if (!err.response) return true;
  if (status === 408 || status === 429) return true;
  return typeof status === 'number' && status >= 500;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as AxiosError<{ message?: string }>;
  return err?.response?.data?.message || err?.message || fallback;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
