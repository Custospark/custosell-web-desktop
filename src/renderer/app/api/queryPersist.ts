import type { Query } from '@tanstack/react-query';

/** Platform admin data should always be fetched fresh — never written to localStorage. */
export function shouldPersistQuery(query: Query): boolean {
  const root = query.queryKey[0];
  if (root === 'platform') {
    return false;
  }
  return query.state.status === 'success';
}
