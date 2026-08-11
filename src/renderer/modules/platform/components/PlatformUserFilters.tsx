import { CheckSquare, Square, UserCog } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import {
  STATUS_DURATION_DAYS,
  USER_ACCOUNT_STATUSES,
  USER_STATUS_LABELS,
} from '../api/platformUserValidation';
import type { UserAccountStatus, UserLoginActivity } from '../api/PlatformTypes';

export type BusinessFilterValue = 'all' | 'with_business' | 'no_business' | 'platform_admin';

interface PlatformUserFiltersProps {
  resultCount: number;
  loginActivityFilter: UserLoginActivity | '';
  onLoginActivityFilterChange: (value: UserLoginActivity | '') => void;
  accountStatusFilter: UserAccountStatus | '';
  onAccountStatusFilterChange: (value: UserAccountStatus | '') => void;
  statusDurationFilter: number | '';
  onStatusDurationFilterChange: (value: number | '') => void;
  businessFilter: BusinessFilterValue;
  onBusinessFilterChange: (value: BusinessFilterValue) => void;
  accountTypeFilter: string;
  onAccountTypeFilterChange: (value: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  onAssignByEmail: () => void;
  actionPending: boolean;
}

export function PlatformUserFilters({
  resultCount,
  loginActivityFilter,
  onLoginActivityFilterChange,
  accountStatusFilter,
  onAccountStatusFilterChange,
  statusDurationFilter,
  onStatusDurationFilterChange,
  businessFilter,
  onBusinessFilterChange,
  accountTypeFilter,
  onAccountTypeFilterChange,
  allSelected,
  onToggleAll,
  onAssignByEmail,
  actionPending,
}: PlatformUserFiltersProps) {
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3">
        <select
          value={loginActivityFilter}
          onChange={(e) => onLoginActivityFilterChange(e.target.value as UserLoginActivity | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="">All login activity</option>
          <option value="active">Active — logged in ≤30d</option>
          <option value="dormant">Dormant — 31–90d since login</option>
          <option value="churned">Churned — 90d+ since login</option>
          <option value="never_logged_in">Never logged in</option>
        </select>
        <select
          value={accountStatusFilter}
          onChange={(e) => {
            onAccountStatusFilterChange(e.target.value as UserAccountStatus | '');
            if (!e.target.value) onStatusDurationFilterChange('');
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="">All account statuses</option>
          {USER_ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>{USER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={statusDurationFilter}
          onChange={(e) => onStatusDurationFilterChange(e.target.value ? Number(e.target.value) : '')}
          disabled={!accountStatusFilter}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit disabled:opacity-50"
          title="Filter users in the selected account status for at least N days"
        >
          <option value="">Any duration</option>
          {STATUS_DURATION_DAYS.map((d) => (
            <option key={d} value={d}>In status ≥ {d} days</option>
          ))}
        </select>
        <select
          value={businessFilter}
          onChange={(e) => onBusinessFilterChange(e.target.value as BusinessFilterValue)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="all">All user types</option>
          <option value="with_business">With business</option>
          <option value="no_business">No business linked</option>
          <option value="platform_admin">Platform operators</option>
        </select>
        <select
          value={accountTypeFilter}
          onChange={(e) => onAccountTypeFilterChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="">All account types</option>
          <option value="business">Business</option>
          <option value="personal">Personal</option>
          <option value="storefront_buyer">Storefront buyer</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleAll}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
          {allSelected ? 'Deselect all' : `Select all (${resultCount})`}
        </button>
        <Button variant="secondary" size="sm" onClick={onAssignByEmail} disabled={actionPending}>
          <UserCog className="w-3.5 h-3.5 mr-1" />Assign by email
        </Button>
      </div>
    </>
  );
}
