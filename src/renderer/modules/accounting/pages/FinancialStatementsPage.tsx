import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useAccountingPeriods, useTrialBalance, useIncomeStatement, useBalanceSheet, useCashFlow, useEquity } from '../api/AccountingQueries';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { Scale, BarChart3, ClipboardList, TrendingUp, PieChart, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

interface StatementCardProps {
  title: string;
  icon: React.ElementType;
  accent: string;
  periodName: string;
  children?: React.ReactNode;
  status?: 'balanced' | 'unbalanced' | 'positive' | 'negative' | 'info';
  onViewPdf: () => void;
  loading?: boolean;
}

function StatementCard({ title, icon: Icon, accent, periodName, children, status, onViewPdf, loading }: StatementCardProps) {
  return (
    <Card padding={false} className="flex flex-col h-full">
      <div className={cn('p-5 border-b', accent)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/80">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{periodName}</p>
          </div>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1 space-y-2">
          {children}
          {status && (
            <div className={cn('flex items-center gap-1.5 text-xs font-medium pt-1',
              status === 'balanced' && 'text-green-600',
              status === 'unbalanced' && 'text-red-500',
              status === 'positive' && 'text-green-600',
              status === 'negative' && 'text-red-500',
            )}>
              {status === 'balanced' || status === 'positive' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {status === 'balanced' && 'Balanced'}
              {status === 'unbalanced' && 'Not Balanced'}
              {status === 'positive' && 'Profitable'}
              {status === 'negative' && 'Net Loss'}
              {status === 'info' && ''}
            </div>
          )}
        </div>
        <button
          onClick={onViewPdf}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          {loading ? 'Loading...' : `View ${title}`}
          <Download className="w-3.5 h-3.5 ml-auto text-blue-400" />
        </button>
      </div>
    </Card>
  );
}

export default function FinancialStatementsPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const { data: periods } = useAccountingPeriods();
  const business = useAppSelector((s) => s.auth.user?.business);

  const effectivePeriodId = useMemo(() => {
    const ids = periodId ? periodId.split(',').map(Number).filter(Boolean) : [];
    return ids.length > 0 ? ids[ids.length - 1] : undefined;
  }, [periodId]);

  const periodName = useMemo(() => {
    const id = effectivePeriodId;
    if (!id || !periods) return '';
    const p = periods.find((p: any) => p.id === id);
    return p?.name ?? '';
  }, [effectivePeriodId, periods]);

  const [downloading, setDownloading] = useState<string | null>(null);

  function viewPdf(type: string) {
    setDownloading(type);
    const pid = effectivePeriodId;
    if (!pid) return;

    const params: Record<string, string | number> = { format: 'pdf' };
    const ids = periodId ? periodId.split(',').map(Number).filter(Boolean) : [];

    if (ids.length > 1) {
      const first = periods?.find((p: any) => p.id === ids[0]);
      const last = periods?.find((p: any) => p.id === ids[ids.length - 1]);
      if (first?.start_date && last?.end_date) {
        params.date_from = first.start_date.slice(0, 10);
        params.date_to = last.end_date.slice(0, 10);
      }
    } else {
      params.period_id = pid;
    }

    axiosInstance.get(ACCOUNTING.EXPORT(type), { params, responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setDownloading(null);
      })
      .catch(() => {
        setDownloading(null);
      });
  }

  // Fetch data for summary cards
  const { data: tb } = useTrialBalance(effectivePeriodId);
  const { data: stmt } = useIncomeStatement(effectivePeriodId);
  const { data: bs } = useBalanceSheet(effectivePeriodId);
  const { data: cf } = useCashFlow(effectivePeriodId);
  const { data: eq } = useEquity(effectivePeriodId);

  if (!effectivePeriodId) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><ClipboardList className="w-5 h-5" /></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Financial Statements</h1>
              <p className="text-sm text-gray-500">Select a period to view your financial reports</p>
            </div>
          </div>
        </Card>
        <div className="flex items-center gap-4">
          <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} className="w-full" />
        </div>
        <Card><div className="h-32 flex items-center justify-center text-sm text-gray-400">Select a period above to view reports</div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><ClipboardList className="w-5 h-5" /></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Financial Statements</h1>
              <p className="text-sm text-gray-500">View and export your financial reports</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} className="w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Trial Balance */}
        <StatementCard title="Trial Balance" icon={Scale} accent="border-l-4 border-l-blue-500" periodName={periodName}
          status={tb?.is_balanced ? 'balanced' : tb ? 'unbalanced' : undefined}
          onViewPdf={() => viewPdf('trial-balance')} loading={downloading === 'trial-balance'}>
          {tb ? (
            <>
              <p className="text-xs text-gray-500">Total Debits</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(tb.total_debits)}</p>
              <p className="text-xs text-gray-500 mt-2">Total Credits</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(tb.total_credits)}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </StatementCard>

        {/* Income Statement */}
        <StatementCard title="Income Statement" icon={BarChart3} accent="border-l-4 border-l-green-500" periodName={periodName}
          status={stmt ? (stmt.net_income >= 0 ? 'positive' : 'negative') : undefined}
          onViewPdf={() => viewPdf('income-statement')} loading={downloading === 'income-statement'}>
          {stmt ? (
            <>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(stmt.total_revenue)}</p>
              <p className="text-xs text-gray-500 mt-2">Net Income</p>
              <p className={cn('text-sm font-semibold tabular-nums', stmt.net_income >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(stmt.net_income)}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </StatementCard>

        {/* Balance Sheet */}
        <StatementCard title="Balance Sheet" icon={ClipboardList} accent="border-l-4 border-l-purple-500" periodName={periodName}
          status={bs?.is_balanced ? 'balanced' : bs ? 'unbalanced' : undefined}
          onViewPdf={() => viewPdf('balance-sheet')} loading={downloading === 'balance-sheet'}>
          {bs ? (
            <>
              <p className="text-xs text-gray-500">Total Assets</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(bs.total_assets)}</p>
              <p className="text-xs text-gray-500 mt-2">Total Liabilities</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(bs.total_liabilities)}</p>
              <p className="text-xs text-gray-500 mt-2">Total Equity</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(bs.total_equity)}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </StatementCard>

        {/* Cash Flow Statement */}
        <StatementCard title="Cash Flow Statement" icon={TrendingUp} accent="border-l-4 border-l-cyan-500" periodName={periodName}
          status={cf ? (cf.net_change >= 0 ? 'positive' : 'negative') : undefined}
          onViewPdf={() => viewPdf('cash-flow')} loading={downloading === 'cash-flow'}>
          {cf ? (
            <>
              <p className="text-xs text-gray-500">Operating</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(cf.operating.total)}</p>
              <p className="text-xs text-gray-500 mt-2">Net Change</p>
              <p className={cn('text-sm font-semibold tabular-nums', cf.net_change >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(cf.net_change)}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </StatementCard>

        {/* Statement of Changes in Equity */}
        <StatementCard title="Changes in Equity" icon={PieChart} accent="border-l-4 border-l-rose-500" periodName={periodName}
          status="info"
          onViewPdf={() => viewPdf('equity')} loading={downloading === 'equity'}>
          {eq ? (
            <>
              <p className="text-xs text-gray-500">Opening Retained Earnings</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(eq.opening_retained_earnings)}</p>
              <p className="text-xs text-gray-500 mt-2">Net Income</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(eq.net_income)}</p>
              <p className="text-xs text-gray-500 mt-2">Total Equity</p>
              <p className="text-sm font-semibold tabular-nums">{fmt(eq.total_equity)}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading...</p>
          )}
        </StatementCard>
      </div>
    </div>
  );
}
