import { CheckSquare, Square } from 'lucide-react';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import {
  BUSINESS_ACCOUNT_STATUSES,
  STATUS_DURATION_DAYS,
  STATUS_LABELS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from '../api/platformBusinessValidation';
import type { BusinessAccountStatus } from '../api/PlatformTypes';

interface PlatformBusinessFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
  accountStatusFilter: BusinessAccountStatus | '';
  onAccountStatusFilterChange: (value: BusinessAccountStatus | '') => void;
  statusDurationFilter: number | '';
  onStatusDurationFilterChange: (value: number | '') => void;
  subscriptionFilter: string;
  onSubscriptionFilterChange: (value: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}

export function PlatformBusinessFilters({
  search,
  onSearchChange,
  resultCount,
  totalCount,
  activityFilter,
  onActivityFilterChange,
  accountStatusFilter,
  onAccountStatusFilterChange,
  statusDurationFilter,
  onStatusDurationFilterChange,
  subscriptionFilter,
  onSubscriptionFilterChange,
  allSelected,
  onToggleAll,
}: PlatformBusinessFiltersProps) {
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="Search by business name, owner email, or business email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange('')}
          />
          <p className="text-xs text-gray-400 mt-1">
            {resultCount} match{resultCount === 1 ? '' : 'es'} · {totalCount} total loaded
          </p>
        </div>
        <select
          value={activityFilter}
          onChange={(e) => onActivityFilterChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="">All activity</option>
          <option value="active">Active - sale or login ≤30d</option>
          <option value="dormant">Dormant - 31-90d since last activity</option>
          <option value="churned">Churned - 90d+ since last activity</option>
          <option value="never_used">Never used - no sales or logins</option>
          <option value="suspended">Suspended account</option>
        </select>
        <select
          value={accountStatusFilter}
          onChange={(e) => {
            onAccountStatusFilterChange(e.target.value as BusinessAccountStatus | '');
            if (!e.target.value) onStatusDurationFilterChange('');
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
        >
          <option value="">All account statuses</option>
          {BUSINESS_ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={statusDurationFilter}
          onChange={(e) => onStatusDurationFilterChange(e.target.value ? Number(e.target.value) : '')}
          disabled={!accountStatusFilter}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit disabled:opacity-50"
          title="Filter businesses in the selected account status for at least N days"
        >
          <option value="">Any duration</option>
          {STATUS_DURATION_DAYS.map((d) => (
            <option key={d} value={d}>In status ≥ {d} days</option>
          ))}
        </select>
        <select
          value={subscriptionFilter}
          onChange={(e) => onSubscriptionFilterChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 h-fit"
          title="Filter by subscription status"
        >
          {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
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
      </div>
    </>
  );
}
