export type FiscalStatus = 'none' | 'pending' | 'fiscalized' | 'failed';

export function normalizeFiscalStatus(status?: string | null): FiscalStatus {
  if (status === 'pending' || status === 'fiscalized' || status === 'failed') return status;
  return 'none';
}
