import { ToggleLeft, ToggleRight } from 'lucide-react';
import { useUpdateChartOfAccount } from '../api/AccountingQueries';
import type { ChartOfAccount } from '../api/AccountingTypes';
import { cn } from '../../../shared/utils/cn';

/** Status pill for a chart-of-accounts row; taps/click toggle active state (except system rows). */
export function AccountStatusBadge({ account }: { account: ChartOfAccount }) {
  const updateAccount = useUpdateChartOfAccount();

  return (
    <button
      type="button"
      onClick={() => {
        if (!account.is_system) {
          updateAccount.mutate({ id: account.id, data: { is_active: !account.is_active } });
        }
      }}
      disabled={account.is_system}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
        account.is_system ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-gray-300',
        account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
      )}
      title={account.is_system ? 'System account' : 'Click to toggle status'}
    >
      {account.is_system ? '' : account.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
      {account.is_active ? 'Active' : 'Inactive'}
    </button>
  );
}
