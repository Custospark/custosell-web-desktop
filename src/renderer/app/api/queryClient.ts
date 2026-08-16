import { QueryCache, QueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../shared/utils/apiErrorMessage';
import { imperativeToast } from '../contexts/imperativeToast';

const ACCOUNTING_ERROR_FALLBACK = 'Failed to load financial report';

/**
 * Report pages fire several queries at once (trial balance, P&L, balance sheet,
 * cash flow, equity) - the same failing request would otherwise toast repeatedly.
 * Only the first occurrence of a message surfaces within a short window.
 */
const recentErrors = new Map<string, number>();

function shouldToast(message: string): boolean {
  const now = Date.now();
  const last = recentErrors.get(message);
  if (last && now - last < 5000) return false;
  recentErrors.set(message, now);
  return true;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const key = query.queryKey;
      if (!Array.isArray(key) || key[0] !== 'accounting') return;
      const message = apiErrorMessage(error, ACCOUNTING_ERROR_FALLBACK);
      if (shouldToast(message)) imperativeToast.show('error', message, 8000);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
