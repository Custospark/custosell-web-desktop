import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { SearchableSelect } from '../../shared/components/inputs/SearchableSelect';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { useReportDownload, useBranchPerformance } from './DashboardQueries';
import { BranchPerformanceTable } from './BranchPerformanceCard';
import { useStaff } from '../settings/api/settings/StaffQueries';
import { useShifts } from '../shifts/ShiftQueries';
import {
  REPORT_DATE_PRESETS,
  isValidDateRange,
  resolveReportDateRange,
  type ReportDatePreset,
} from '../../shared/utils/reportDatePresets';
import {
  Download, FileText, TrendingUp, Receipt, Package, CreditCard, FileSpreadsheet,
  File, FileDown, WifiOff, BarChart3, Users, ShoppingBag, Scale,
} from 'lucide-react';

interface ReportConfig {
  key: string;
  label: string;
  description: string;
  purpose: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  textColor: string;
  formats: { value: string; label: string; icon: React.ElementType; recommended?: boolean }[];
  defaultFormat: string;
  hasDateRange: boolean;
  supportsCashierFilter?: boolean;
  supportsShiftFilter?: boolean;
  onScreen?: boolean;
}

const reports: ReportConfig[] = [
  {
    key: 'business-summary', label: 'Business Summary', description: 'P&L snapshot for the period',
    purpose: 'Am I making money?',
    icon: BarChart3, color: 'blue', bg: 'bg-blue-50', textColor: 'text-blue-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true,
  },
  {
    key: 'daily-sales', label: 'Daily Sales', description: 'Transactions with line items and refunds',
    purpose: 'What sold and what was refunded?',
    icon: Receipt, color: 'blue', bg: 'bg-blue-50', textColor: 'text-blue-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true,
  },
  {
    key: 'sales-trend', label: 'Sales Trend', description: 'Daily gross, refunds, expenses, and net sales',
    purpose: 'How is performance trending?',
    icon: TrendingUp, color: 'green', bg: 'bg-green-50', textColor: 'text-green-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true,
  },
  {
    key: 'product-performance', label: 'Product Performance', description: 'Top sellers by revenue and quantity, slow movers, and no-sales products',
    purpose: 'What should I stock, push, or drop?',
    icon: ShoppingBag, color: 'indigo', bg: 'bg-indigo-50', textColor: 'text-indigo-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsCashierFilter: true,
  },
  {
    key: 'shift-reconciliation', label: 'Shift Reconciliation', description: 'Cash handover and shift totals',
    purpose: 'Is my cash drawer balanced?',
    icon: Users, color: 'teal', bg: 'bg-teal-50', textColor: 'text-teal-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true,
  },
  {
    key: 'expenses', label: 'Expenses', description: 'Expense breakdown by category with P&L context',
    purpose: 'Where is money leaking?',
    icon: FileText, color: 'red', bg: 'bg-red-50', textColor: 'text-red-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true, supportsShiftFilter: true,
  },
  {
    key: 'vat-summary', label: 'VAT Summary', description: 'Output VAT, input VAT, and estimated VAT payable for your jurisdiction',
    purpose: 'What VAT is due this period?',
    icon: Scale, color: 'violet', bg: 'bg-violet-50', textColor: 'text-violet-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true,
  },
  {
    key: 'inventory', label: 'Inventory', description: 'Stock levels, values, and low-stock alerts',
    purpose: 'What must I reorder?',
    icon: Package, color: 'purple', bg: 'bg-purple-50', textColor: 'text-purple-600',
    formats: [
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, recommended: true },
      { value: 'csv', label: 'CSV', icon: File },
      { value: 'pdf', label: 'PDF', icon: FileText },
    ],
    defaultFormat: 'xlsx', hasDateRange: false,
  },
  {
    key: 'branch-performance', label: 'Branch Performance', description: 'Per-branch net sales, transactions, and share',
    purpose: 'Which branch is performing best?',
    icon: BarChart3, color: 'blue', bg: 'bg-blue-50', textColor: 'text-blue-600',
    formats: [],
    defaultFormat: '', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true, onScreen: true,
  },
  {
    key: 'payment-breakdown', label: 'Payment Breakdown', description: 'Collections by payment method (net after refunds)',
    purpose: 'How are customers paying?',
    icon: CreditCard, color: 'amber', bg: 'bg-amber-50', textColor: 'text-amber-600',
    formats: [
      { value: 'csv', label: 'CSV', icon: File, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'pdf', label: 'PDF', icon: FileText },
    ],
    defaultFormat: 'csv', hasDateRange: true, supportsCashierFilter: true, supportsShiftFilter: true,
  },
];

export default function QuickReports() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const downloadReport = useReportDownload();
  const { data: staff = [] } = useStaff();
  const { data: shifts = [] } = useShifts();

  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [datePreset, setDatePreset] = useState<ReportDatePreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [format, setFormat] = useState('');
  const [userId, setUserId] = useState('');
  const [shiftId, setShiftId] = useState('');

  const { dateFrom, dateTo } = useMemo(
    () => resolveReportDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const { data: branchData, isLoading: branchLoading } = useBranchPerformance(dateFrom, dateTo);

  const dateRangeValid = !selectedReport?.hasDateRange || isValidDateRange(dateFrom, dateTo);

  const cashierOptions = useMemo(
    () => staff.map((member) => ({ value: String(member.id), label: member.name })),
    [staff],
  );

  const shiftOptions = useMemo(() => {
    let list = shifts;

    if (userId) {
      list = list.filter((shift) => String(shift.user_id) === userId);
    }

    if (selectedReport?.hasDateRange && dateFrom && dateTo) {
      list = list.filter((shift) => {
        const clockInDate = shift.clock_in.slice(0, 10);
        return clockInDate >= dateFrom && clockInDate <= dateTo;
      });
    }

    return list.slice(0, 50).map((shift) => {
      const cashierName =
        staff.find((member) => member.id === shift.user_id)?.name
        ?? shift.user?.data?.name
        ?? 'Staff';
      const when = new Date(shift.clock_in).toLocaleString();
      const label = userId
        ? `${when} - ${shift.status}`
        : `${when} - ${shift.status} (${cashierName})`;

      return { value: String(shift.id), label };
    });
  }, [shifts, userId, dateFrom, dateTo, selectedReport?.hasDateRange, staff]);

  useEffect(() => {
    if (!shiftId) return;
    const stillValid = shiftOptions.some((option) => option.value === shiftId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!stillValid) setShiftId('');
  }, [shiftId, shiftOptions]);

  const handleCashierChange = (nextUserId: string) => {
    setUserId(nextUserId);
    if (shiftId && nextUserId) {
      const selectedShift = shifts.find((shift) => String(shift.id) === shiftId);
      if (selectedShift && String(selectedShift.user_id) !== nextUserId) {
        setShiftId('');
      }
    }
  };

  const openReport = (report: ReportConfig) => {
    if (isOffline) return;
    setSelectedReport(report);
    setFormat(report.defaultFormat);
    setDatePreset('today');
    setUserId('');
    setShiftId('');
  };

  const handleDownload = () => {
    if (!selectedReport || isOffline || !dateRangeValid || selectedReport.onScreen) return;

    const params = new URLSearchParams({ format });
    if (selectedReport.hasDateRange) {
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
    }
    if (selectedReport.supportsCashierFilter && userId) {
      params.set('user_id', userId);
    }
    if (selectedReport.supportsShiftFilter && shiftId) {
      params.set('shift_id', shiftId);
    }

    const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv';
    downloadReport(`/reports/${selectedReport.key}`, params, `${selectedReport.key}-report.${ext}`);
    setSelectedReport(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-500" />
          Download Business Reports ({reports.length})
        </h3>
        {isOffline && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Reports require an internet connection.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 max-h-[28rem] overflow-y-auto pr-1">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.key}
                type="button"
                onClick={() => openReport(report)}
                disabled={isOffline}
                title={isOffline ? 'Unavailable offline' : undefined}
                className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${report.bg} hover:shadow-md transition-all text-left group w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none`}
              >
                <div className={`p-2.5 rounded-lg ${report.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <Icon className={`w-5 h-5 ${report.textColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{report.label}</p>
                  <p className="text-xs text-gray-500">{report.description}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5 italic">{report.purpose}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={`Download ${selectedReport?.label || 'Report'}`}
        size="xl"
        overflowVisible
        bodyClassName="px-4 sm:px-6 py-4 sm:py-5 min-h-0 sm:min-h-[26rem]"
      >
        {selectedReport && (
          <div className="flex flex-col min-h-0 sm:min-h-[24rem]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1">
              {/* Left - scope & filters */}
              <div className="space-y-4 overflow-visible">
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{selectedReport.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedReport.description}</p>
                  <p className="text-xs text-blue-600 mt-1.5 italic">{selectedReport.purpose}</p>
                </div>

                {selectedReport.hasDateRange ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {REPORT_DATE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDatePreset(preset.id)}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                              datePreset === preset.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {datePreset === 'custom' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                          <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                        {dateFrom === dateTo ? `Reporting for ${dateFrom}` : `${dateFrom} - ${dateTo}`}
                      </p>
                    )}

                    {!dateRangeValid && (
                      <p className="text-xs text-red-600">Start date must be on or before end date.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600 bg-purple-50/50 border border-purple-100 rounded-lg px-3 py-2">
                    Snapshot as of today - no date range required.
                  </p>
                )}

                {(selectedReport.supportsCashierFilter || selectedReport.supportsShiftFilter) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReport.supportsCashierFilter && staff.length > 0 && (
                      <SearchableSelect
                        label="Sales Person"
                        value={userId}
                        onChange={handleCashierChange}
                        options={cashierOptions}
                        placeholder="All sales people"
                        searchPlaceholder="Search sales people..."
                        emptyOption={{ value: '', label: 'All sales people' }}
                      />
                    )}
                    {selectedReport.supportsShiftFilter && (
                      <SearchableSelect
                        label="Shift"
                        value={shiftId}
                        onChange={setShiftId}
                        options={shiftOptions}
                        placeholder={userId ? 'All shifts for this sales person' : 'All shifts'}
                        searchPlaceholder="Search shifts..."
                        emptyOption={{
                          value: '',
                          label: userId ? 'All shifts for this sales person' : 'All shifts',
                        }}
                        disabled={userId !== '' && shiftOptions.length === 0}
                      />
                    )}
                    {selectedReport.supportsShiftFilter && userId && shiftOptions.length === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 sm:col-span-2">
                        No shifts found for this sales person in the selected period.
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 pt-1">Net sales = gross - refunds - expenses</p>
              </div>

              {/* Right - format */}
              <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                {selectedReport.onScreen ? (
                  <BranchPerformanceTable
                    branches={branchData?.branches ?? []}
                    isLoading={branchLoading}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                ) : (
                  <>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Export format</label>
                <div className="grid grid-cols-3 gap-3 flex-1 content-start">
                  {selectedReport.formats.map((fmt) => {
                    const FmtIcon = fmt.icon;
                    const selected = format === fmt.value;
                    return (
                      <button
                        key={fmt.value}
                        type="button"
                        onClick={() => setFormat(fmt.value)}
                        className={`flex flex-col items-center justify-center gap-2 min-h-[6.5rem] p-3 rounded-xl border-2 transition-all text-sm ${
                          selected
                            ? 'border-blue-500 bg-white text-blue-700 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <FmtIcon className={`w-6 h-6 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="font-semibold">{fmt.label}</span>
                        {fmt.recommended && (
                          <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Recommended</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                </>
                )}
              </div>
            </div>

            {!selectedReport.onScreen && (
            <div className="flex items-center justify-between gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 hidden sm:block">Downloads use your business name in the filename.</p>
              <div className="flex gap-2 sm:gap-3 ml-auto">
                <Button variant="outline" size="sm" className="sm:hidden" onClick={() => setSelectedReport(null)}>Cancel</Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setSelectedReport(null)}>Cancel</Button>
                <Button size="sm" className="sm:hidden" onClick={handleDownload} disabled={isOffline || !dateRangeValid}>
                  <FileDown className="w-4 h-4" />
                </Button>
                <Button size="sm" className="hidden sm:inline-flex" onClick={handleDownload} disabled={isOffline || !dateRangeValid} title={isOffline ? 'Unavailable offline' : undefined}>
                  <FileDown className="w-4 h-4 mr-1.5" />Download
                </Button>
              </div>
            </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
