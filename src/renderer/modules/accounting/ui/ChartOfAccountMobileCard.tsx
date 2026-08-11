import type { ChartOfAccount } from '../api/AccountingTypes';
import { cn } from '../../../shared/utils/cn';
import { AccountActions } from './AccountActions';
import { AccountStatusBadge } from './AccountStatusBadge';

/** Card fallback for chart-of-accounts rows on viewports below `md`. */
export function ChartOfAccountMobileCard({ account }: { account: ChartOfAccount }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono font-semibold text-gray-900">{account.code}</p>
          <p className="mt-0.5 truncate text-sm text-gray-600">{account.name}</p>
        </div>
        <div className="shrink-0"><AccountStatusBadge account={account} /></div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-gray-100 pt-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Type</p>
          <p className="text-sm font-medium text-gray-900">{account.account_type?.name ?? '-'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500">Normal Balance</p>
          <p className={cn('text-sm font-medium capitalize', account.normal_balance === 'debit' ? 'text-amber-600' : 'text-blue-600')}>
            {account.normal_balance}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
        <AccountActions account={account} />
      </div>
    </article>
  );
}
