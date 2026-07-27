import type { Query } from '@tanstack/react-query';

const ACCOUNTING_FRESH_REPORT_KINDS = new Set([
  'trial-balance',
  'income-statement',
  'balance-sheet',
  'cash-flow',
  'equity',
  'ratios',
]);

function isFreshFinancialReportQuery(key: readonly unknown[]): boolean {
  return key[0] === 'accounting'
    && typeof key[1] === 'string'
    && ACCOUNTING_FRESH_REPORT_KINDS.has(key[1]);
}

/** Platform admin + live financial reports + subscription access should always be fetched fresh — never written to localStorage. */
export function shouldPersistQuery(query: Query): boolean {
  const root = query.queryKey[0];
  if (root === 'platform') {
    return false;
  }
  if (root === 'subscription') {
    return false;
  }
  if (isFreshFinancialReportQuery(query.queryKey)) {
    return false;
  }
  return query.state.status === 'success';
}
