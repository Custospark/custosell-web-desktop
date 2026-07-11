import { FileText, List, Plus, RefreshCw, Store } from 'lucide-react';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import { formatCurrency } from '../../shared/utils/formatCurrency';

type InvoiceView = 'list' | 'create' | 'edit';

interface InvoicesPageHeaderProps {
  isSupplierMode: boolean;
  pageTitle: string;
  pageSubtitle: string;
  effectiveView: InvoiceView;
  isFetching: boolean;
  stats: { total: number; drafts: number; outstanding: number; overdueCount: number };
  onRefresh: () => void;
  onShowList: () => void;
  onShowCreate: () => void;
  onExploreMarketplace: () => void;
}

export function InvoicesPageHeader({
  isSupplierMode,
  pageTitle,
  pageSubtitle,
  effectiveView,
  isFetching,
  stats,
  onRefresh,
  onShowList,
  onShowCreate,
  onExploreMarketplace,
}: InvoicesPageHeaderProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{pageSubtitle}</p>
          </div>
        </div>

        {!isSupplierMode ? (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-2"
              disabled={isFetching}
              onClick={onRefresh}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={onShowList}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  effectiveView === 'list'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                <List className="h-4 w-4" />
                Invoice list
              </button>
              <button
                type="button"
                onClick={onShowCreate}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  effectiveView === 'create'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                <Plus className="h-4 w-4" />
                New invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-2"
              disabled={isFetching}
              onClick={onRefresh}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="inline-flex items-center gap-2"
              onClick={onExploreMarketplace}
            >
              <Store className="h-4 w-4" />
              Explore marketplace
            </Button>
          </div>
        )}
      </div>

      {effectiveView === 'list' && stats.total > 0 ? (
        <div className="grid grid-cols-2 gap-px border-t border-gray-200 bg-gray-200 sm:grid-cols-4">
          {[
            { label: 'Total', value: String(stats.total) },
            {
              label: isSupplierMode ? 'Open balance' : 'Drafts',
              value: isSupplierMode ? formatCurrency(stats.outstanding) : String(stats.drafts),
            },
            { label: 'Outstanding', value: formatCurrency(stats.outstanding) },
            { label: 'Overdue', value: String(stats.overdueCount), warn: stats.overdueCount > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className="bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', warn ? 'text-red-600' : 'text-gray-900')}>
                {value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
