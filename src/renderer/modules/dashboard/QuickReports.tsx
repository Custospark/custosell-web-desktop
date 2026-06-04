import { useState } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { useReportDownload } from './DashboardQueries';
import { Download, FileText, TrendingUp, Receipt, Package, CreditCard, FileSpreadsheet, File, FileDown } from 'lucide-react';

interface ReportConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  textColor: string;
  formats: { value: string; label: string; icon: React.ElementType; recommended?: boolean }[];
  defaultFormat: string;
  hasDateRange: boolean;
}

const reports: ReportConfig[] = [
  {
    key: 'daily-sales', label: 'Daily Sales', description: 'Sales transactions with line items',
    icon: Receipt, color: 'blue', bg: 'bg-blue-50', textColor: 'text-blue-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true,
  },
  {
    key: 'sales-trend', label: 'Sales Trend', description: 'Daily revenue and transaction trends',
    icon: TrendingUp, color: 'green', bg: 'bg-green-50', textColor: 'text-green-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true,
  },
  {
    key: 'expenses', label: 'Expenses', description: 'Expense breakdown by category',
    icon: FileText, color: 'red', bg: 'bg-red-50', textColor: 'text-red-600',
    formats: [
      { value: 'pdf', label: 'PDF', icon: FileText, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'csv', label: 'CSV', icon: File },
    ],
    defaultFormat: 'pdf', hasDateRange: true,
  },
  {
    key: 'inventory', label: 'Inventory', description: 'Product stock levels and values',
    icon: Package, color: 'purple', bg: 'bg-purple-50', textColor: 'text-purple-600',
    formats: [
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, recommended: true },
      { value: 'csv', label: 'CSV', icon: File },
      { value: 'pdf', label: 'PDF', icon: FileText },
    ],
    defaultFormat: 'xlsx', hasDateRange: false,
  },
  {
    key: 'payment-breakdown', label: 'Payment Breakdown', description: 'Sales by payment method',
    icon: CreditCard, color: 'yellow', bg: 'bg-yellow-50', textColor: 'text-yellow-600',
    formats: [
      { value: 'csv', label: 'CSV', icon: File, recommended: true },
      { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
      { value: 'pdf', label: 'PDF', icon: FileText },
    ],
    defaultFormat: 'csv', hasDateRange: true,
  },
];

export default function QuickReports() {
  const downloadReport = useReportDownload();
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('');

  const openReport = (report: ReportConfig) => {
    setSelectedReport(report);
    setFormat(report.defaultFormat);
  };

  const handleDownload = () => {
    if (!selectedReport) return;
    const params = new URLSearchParams({ format });
    if (selectedReport.hasDateRange) {
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
    }
    const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv';
    downloadReport(`/reports/${selectedReport.key}`, params, `${selectedReport.key}-report.${ext}`);
    setSelectedReport(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-500" />
          Quick Reports
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button key={report.key} onClick={() => openReport(report)}
                className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${report.bg} hover:shadow-md transition-all text-left group w-full`}>
                <div className={`p-2.5 rounded-lg ${report.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <Icon className={`w-5 h-5 ${report.textColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{report.label}</p>
                  <p className="text-xs text-gray-500">{report.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Download ${selectedReport?.label || 'Report'}`} size="sm">
        {selectedReport && (
          <div className="space-y-5">
            {/* Date Range */}
            {selectedReport.hasDateRange && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="grid grid-cols-3 gap-2">
                {selectedReport.formats.map((fmt) => {
                  const FmtIcon = fmt.icon;
                  return (
                    <button key={fmt.value} onClick={() => setFormat(fmt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${
                        format === fmt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>
                      <FmtIcon className="w-5 h-5" />
                      <span className="font-medium">{fmt.label}</span>
                      {fmt.recommended && <span className="text-[10px] text-blue-500 font-medium">Best</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
              <Button onClick={handleDownload}>
                <FileDown className="w-4 h-4 mr-1.5" />Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
