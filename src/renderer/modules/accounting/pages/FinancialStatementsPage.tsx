import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { useAccountingPeriods } from '../api/AccountingQueries';
import { useReportDownload } from '../../dashboard/DashboardQueries';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { Printer, Scale, BarChart3, ClipboardList, ChevronDown, ChevronRight, Download, FileSpreadsheet, TrendingUp, PieChart } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { useAppSelector } from '../../../app/store/hooks/useApp';

type TabKey = 'trial-balance' | 'income-statement' | 'balance-sheet' | 'cash-flow' | 'equity';

const TABS: { key: TabKey; label: string; icon: React.ElementType; accent: string }[] = [
  { key: 'trial-balance', label: 'Trial Balance', icon: Scale, accent: 'border-blue-500 bg-blue-50' },
  { key: 'income-statement', label: 'Income Statement', icon: BarChart3, accent: 'border-green-500 bg-green-50' },
  { key: 'balance-sheet', label: 'Balance Sheet', icon: ClipboardList, accent: 'border-purple-500 bg-purple-50' },
  { key: 'cash-flow', label: 'Cash Flow', icon: TrendingUp, accent: 'border-cyan-500 bg-cyan-50' },
  { key: 'equity', label: 'Equity', icon: PieChart, accent: 'border-rose-500 bg-rose-50' },
];

function TabButton({ active, tab, onClick }: { active: boolean; tab: typeof TABS[number]; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={cn('flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all',
      active ? 'bg-white text-gray-900 shadow-sm border border-gray-200 ring-1 ring-gray-100'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
      <Icon className="w-5 h-5" /><span>{tab.label}</span>
      {active ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
    </button>
  );
}

function PdfReportView({ type, periodId, rawPeriodId, periods, onLoad }: { type: string; periodId?: number; rawPeriodId?: string; periods: any; onLoad?: () => void }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!periodId) return;

    setPdfUrl(null);
    setError(false);

    const params: Record<string, string | number> = { format: 'pdf' };
    params.period_id = periodId;

    // For quarter selection (comma-separated IDs), send date range instead
    if (rawPeriodId?.includes(',')) {
      const ids = rawPeriodId.split(',').map(Number).filter(Boolean);
      if (ids.length > 1) {
        const first = periods?.find((p: any) => p.id === ids[0]);
        const last = periods?.find((p: any) => p.id === ids[ids.length - 1]);
        if (first?.start_date && last?.end_date) {
          delete params.period_id;
          params.date_from = first.start_date.slice(0, 10);
          params.date_to = last.end_date.slice(0, 10);
        }
      }
    }

    axiosInstance.get(ACCOUNTING.EXPORT(type), { params, responseType: 'blob' })
      .then((res) => {
        if (!mountedRef.current) return;
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setPdfUrl(url);
        onLoad?.();
      }).catch(() => {
        if (mountedRef.current) setError(true);
      });

    return () => { mountedRef.current = false; };
  }, [type, periodId, rawPeriodId]);

  if (!periodId) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">Select a period first</div>;
  if (error) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load report.</p></Card>;
  if (!pdfUrl) return <div className="py-16"><LoadingSpinner /></div>;

  return (
    <div className="w-full print:block">
      <embed src={pdfUrl} type="application/pdf" className="w-full h-[600px] border border-gray-200 rounded-lg print:h-auto print:min-h-0" />
    </div>
  );
}

export default function FinancialStatementsPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [pdfReady, setPdfReady] = useState(false);
  const { data: periods } = useAccountingPeriods();
  const business = useAppSelector((s) => s.auth.user?.business);
  const downloadReport = useReportDownload();

  const effectivePeriodId = useMemo(() => {
    const ids = periodId ? periodId.split(',').map(Number).filter(Boolean) : [];
    return ids.length > 0 ? ids[ids.length - 1] : undefined;
  }, [periodId]);

  const STATEMENT_TYPE: Record<TabKey, string> = {
    'trial-balance': 'trial-balance',
    'income-statement': 'income-statement',
    'balance-sheet': 'balance-sheet',
    'cash-flow': 'cash-flow',
    'equity': 'equity',
  };

  function toggleTab(tab: TabKey) {
    setPdfReady(false);
    setActiveTab((prev) => prev === tab ? null : tab);
  }

  function openDownload() {
    if (!activeTab) return;
    setDownloadFormat('pdf');
    setDownloadOpen(true);
  }

  function doDownload() {
    if (!activeTab) return;
    const type = STATEMENT_TYPE[activeTab];
    const params = new URLSearchParams();
    if (effectivePeriodId) params.set('period_id', String(effectivePeriodId));
    params.set('format', downloadFormat);
    downloadReport(ACCOUNTING.EXPORT(type), params, `${type}.${downloadFormat}`);
    setDownloadOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Financial Statements</h1>
              <p className="text-sm text-gray-500">View and export your financial reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!pdfReady && !activeTab}>
              <Printer className="w-4 h-4 mr-1.5" />Print
            </Button>
            <Button variant="outline" size="sm" onClick={openDownload} disabled={!activeTab}>
              <Download className="w-4 h-4 mr-1.5" />Download
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} className="w-full" />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {TABS.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onClick={() => toggleTab(tab.key)} />
        ))}
      </div>

      {activeTab && (
        <PdfReportView
          key={`${activeTab}-${periodId || effectivePeriodId ?? 'none'}`}
          type={STATEMENT_TYPE[activeTab]}
          periodId={effectivePeriodId}
          rawPeriodId={periodId}
          periods={periods}
          onLoad={() => setPdfReady(true)}
        />
      )}

      {!activeTab && (
        <Card>
          <div className="h-32 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Click a report above to view it here
          </div>
        </Card>
      )}

      <Modal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} title="Download Report" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Download <strong>{activeTab ? activeTab.replace('-', ' ') : ''}</strong> in the selected format.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setDownloadFormat('pdf')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'pdf' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}>
              <Download className="w-4 h-4 mx-auto mb-1" />PDF Document
            </button>
            <button onClick={() => setDownloadFormat('xlsx')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'xlsx' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}>
              <FileSpreadsheet className="w-4 h-4 mx-auto mb-1" />Excel Spreadsheet
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button type="button" onClick={doDownload}>Download</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
