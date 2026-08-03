import { useState } from 'react';
import { FileDown, Database, Table, FileSpreadsheet, Download, ShieldAlert, Loader2 } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { TOOL_DESCRIPTIONS } from '../personal/toolDescriptions';
import { useBusinessExport } from './api/settings/BusinessQueries';
import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';

type ExportFormat = 'json' | 'csv' | 'xlsx';

const FORMATS: { value: ExportFormat; label: string; description: string; icon: typeof Database }[] = [
  { value: 'json', label: 'JSON', description: 'Full structured data — all your records in one file', icon: Database },
  { value: 'csv', label: 'CSV', description: 'Comma-separated values — easy to open in spreadsheets', icon: Table },
  { value: 'xlsx', label: 'Excel (XLSX)', description: 'Formatted Excel workbook', icon: FileSpreadsheet },
];

/**
 * What's included in a data export — deliberately hardcoded per account type and
 * independent of the subscription's live status. A lapsed/suspended user must still
 * see exactly what their export contains, so we never derive this from plan_features
 * or the currently-accessible modules. Descriptions reuse the shared Your Tools copy.
 */
const INCLUDED_LABELS: Record<'personal' | 'business', string[]> = {
  personal: [
    'Sales Funnel',
    'Projects & Estimates',
    'Income & Expenses',
    'Accounting',
    'Documents',
  ],
  business: [
    'Dashboard',
    'Sales',
    'Inventory & Supply Chain',
    'Customers',
    'Sales Funnel',
    'Projects & Estimates',
    'Income & Expenses',
    'Accounting',
    'Documents',
    'Forecasting',
    'HR & Payroll',
  ],
};

interface IncludedTool {
  label: string;
  description: string;
}

export default function DataExportPage() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exportMutation = useBusinessExport();
  const { isCompletelyOffline } = useNetworkStatus();
  const user = useAppSelector((s) => s.auth.user);
  const isPersonal = user?.account_type === 'personal';

  const accountKind = isPersonal ? 'personal' : 'business';
  const copy = TOOL_DESCRIPTIONS[accountKind];
  const includedItems: IncludedTool[] = INCLUDED_LABELS[accountKind].map((label) => ({
    label,
    description: copy[label],
  }));

  const handleExport = () => {
    setConfirmOpen(true);
  };

  const handleConfirmExport = () => {
    setConfirmOpen(false);
    exportMutation.mutate({ format });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl pb-10 sm:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data & Export</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isPersonal
            ? 'Export all your personal data for backup, migration, or record-keeping.'
            : 'Export all your business data for backup, migration, or record-keeping.'}
        </p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                {isPersonal ? 'Full Personal Data Export' : 'Full Business Data Export'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPersonal
                  ? 'Pipeline, estimates, expenses, accounting, documents, and more'
                  : 'Products, customers, sales, invoices, expenses, accounting, pipeline, documents, and more'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Choose export format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const selected = format === fmt.value;
                return (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => setFormat(fmt.value)}
                    className={cn(
                      'relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                      selected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      selected ? 'bg-emerald-100' : 'bg-gray-50',
                    )}>
                      <Icon className={cn('w-5 h-5', selected ? 'text-emerald-600' : 'text-gray-500')} />
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', selected ? 'text-emerald-900' : 'text-gray-800')}>
                        {fmt.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{fmt.description}</p>
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {isPersonal ? 'Owner-only action' : 'Owner-only action'}
                </p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {isPersonal
                    ? 'Only you can export your data. Exports include all your personal records.'
                    : 'Only the business owner can export all data. Staff members cannot initiate exports. Exports include all business records and user information.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          {confirmOpen ? (
            <div className="space-y-4 bg-gray-50 rounded-xl border border-gray-200 p-5">
              <div>
                <p className="text-sm font-semibold text-gray-800">Confirm data export</p>
                <p className="text-xs text-gray-600 mt-1">
                  This will generate a full export of all your {isPersonal ? 'personal' : 'business'} data in <strong>{format.toUpperCase()}</strong> format.
                  The file will be downloaded automatically when ready.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={handleConfirmExport} disabled={exportMutation.isPending}>
                  {exportMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exporting...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-1.5" /> Confirm & Download</>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={exportMutation.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleExport}
              disabled={exportMutation.isPending || isCompletelyOffline}
              className="w-full sm:w-auto"
            >
              {exportMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating export...</>
              ) : isCompletelyOffline ? (
                <><ShieldAlert className="w-4 h-4 mr-1.5" /> Data export requires internet connection</>
              ) : (
                <><FileDown className="w-4 h-4 mr-1.5" /> Export All Data ({format.toUpperCase()})</>
              )}
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            What's included
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 text-xs text-gray-600">
            {includedItems.map((item) => (
              <div key={item.label} className="flex items-start gap-1.5 py-1">
                <svg className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="text-gray-500"> — {item.description}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
