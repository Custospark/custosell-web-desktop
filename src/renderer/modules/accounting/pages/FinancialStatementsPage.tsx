import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { useAccountingPeriods, useTrialBalance, useIncomeStatement, useBalanceSheet, useCashFlow, useEquity } from '../api/AccountingQueries';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { Scale, BarChart3, ClipboardList, TrendingUp, PieChart, FileText, Download, Calendar } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { motion } from 'framer-motion';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

const CARD_STYLES: Record<string, { icon: React.ElementType; label: string; border: string; bg: string; iconBg: string; iconColor: string; gradient: string }> = {
  'trial-balance': {
    icon: Scale, label: 'Trial Balance', border: 'border-l-4 border-l-blue-500',
    bg: 'bg-blue-50/40', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', gradient: 'from-blue-500 to-blue-600',
  },
  'income-statement': {
    icon: BarChart3, label: 'Income Statement', border: 'border-l-4 border-l-green-500',
    bg: 'bg-green-50/40', iconBg: 'bg-green-100', iconColor: 'text-green-600', gradient: 'from-green-500 to-green-600',
  },
  'balance-sheet': {
    icon: ClipboardList, label: 'Balance Sheet', border: 'border-l-4 border-l-purple-500',
    bg: 'bg-purple-50/40', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', gradient: 'from-purple-500 to-purple-600',
  },
  'cash-flow': {
    icon: TrendingUp, label: 'Cash Flow', border: 'border-l-4 border-l-cyan-500',
    bg: 'bg-cyan-50/40', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', gradient: 'from-cyan-500 to-cyan-600',
  },
  'equity': {
    icon: PieChart, label: 'Changes in Equity', border: 'border-l-4 border-l-rose-500',
    bg: 'bg-rose-50/40', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', gradient: 'from-rose-500 to-rose-600',
  },
};

function MetricRow({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', positive && 'text-green-600', negative && 'text-red-600')}>{value}</span>
    </div>
  );
}

function StatusBadge({ label, type }: { label: string; type: 'success' | 'danger' | 'warning' | 'info' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
      type === 'success' && 'bg-green-100 text-green-700',
      type === 'danger' && 'bg-red-100 text-red-700',
      type === 'warning' && 'bg-amber-100 text-amber-700',
      type === 'info' && 'bg-gray-100 text-gray-500',
    )}>
      {label}
    </span>
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
      .catch(() => setDownloading(null));
  }

  const { data: tb } = useTrialBalance(effectivePeriodId);
  const { data: stmt } = useIncomeStatement(effectivePeriodId);
  const { data: bs } = useBalanceSheet(effectivePeriodId);
  const { data: cf } = useCashFlow(effectivePeriodId);
  const { data: eq } = useEquity(effectivePeriodId);

  const isLoading = effectivePeriodId && !tb && !stmt && !bs && !cf && !eq;

  if (!effectivePeriodId) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><ClipboardList className="w-5 h-5" /></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Financial Statements</h1>
                <p className="text-sm text-gray-500">Select a period to view your financial reports</p>
              </div>
            </div>
          </div>
        </Card>
        <div className="flex items-center gap-4">
          <PeriodSelector periods={periods} value={periodId} onChange={setPeriodId} className="w-full" />
        </div>
        <div className="flex items-center justify-center h-48 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Select a period to view reports</p>
          </div>
        </div>
      </div>
    );
  }

  const statements = [
    {
      key: 'trial-balance',
      data: tb,
      metrics: tb ? [
        { label: 'Total Debits', value: fmt(tb.total_debits) },
        { label: 'Total Credits', value: fmt(tb.total_credits) },
      ] : [],
      badge: tb ? { label: tb.is_balanced ? 'Balanced' : 'Unbalanced', type: tb.is_balanced ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'income-statement',
      data: stmt,
      metrics: stmt ? [
        { label: 'Revenue', value: fmt(stmt.total_revenue) },
        { label: 'Net Income', value: fmt(stmt.net_income), positive: stmt.net_income >= 0, negative: stmt.net_income < 0 },
      ] : [],
      badge: stmt ? { label: stmt.net_income >= 0 ? 'Profitable' : 'Net Loss', type: stmt.net_income >= 0 ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'balance-sheet',
      data: bs,
      metrics: bs ? [
        { label: 'Assets', value: fmt(bs.total_assets) },
        { label: 'Liabilities', value: fmt(bs.total_liabilities) },
        { label: 'Equity', value: fmt(bs.total_equity) },
      ] : [],
      badge: bs ? { label: bs.is_balanced ? 'A = L + E' : 'Out of Balance', type: bs.is_balanced ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'cash-flow',
      data: cf,
      metrics: cf ? [
        { label: 'Operating', value: fmt(cf.operating.total) },
        { label: 'Net Change', value: fmt(cf.net_change), positive: cf.net_change >= 0, negative: cf.net_change < 0 },
      ] : [],
      badge: cf ? { label: cf.net_change >= 0 ? 'Positive' : 'Negative', type: cf.net_change >= 0 ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'equity',
      data: eq,
      metrics: eq ? [
        { label: 'Opening RE', value: fmt(eq.opening_retained_earnings) },
        { label: 'Net Income', value: fmt(eq.net_income), positive: eq.net_income >= 0, negative: eq.net_income < 0 },
        { label: 'Total Equity', value: fmt(eq.total_equity) },
      ] : [],
      badge: eq ? { label: 'Equity', type: 'info' as const } : null,
    },
  ];

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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-48 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statements.map((s) => {
            const style = CARD_STYLES[s.key];
            const Icon = style.icon;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * statements.indexOf(s) }}
              >
                <Card padding={false} className="group relative flex flex-col h-full transition-shadow duration-200 hover:shadow-md">
                  {/* Accent bar */}
                  <div className={cn('h-1 rounded-t-xl', s.key === 'trial-balance' && 'bg-blue-500', s.key === 'income-statement' && 'bg-green-500',
                    s.key === 'balance-sheet' && 'bg-purple-500', s.key === 'cash-flow' && 'bg-cyan-500', s.key === 'equity' && 'bg-rose-500')} />

                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-xl', style.iconBg)}>
                          <Icon className={cn('w-5 h-5', style.iconColor)} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{style.label}</h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">{periodName}</p>
                        </div>
                      </div>
                      {s.badge && <StatusBadge label={s.badge.label} type={s.badge.type} />}
                    </div>

                    {/* Metrics */}
                    <div className="flex-1 space-y-0.5">
                      {s.metrics.length > 0 ? s.metrics.map((m, i) => (
                        <MetricRow key={i} label={m.label} value={m.value} positive={m.positive} negative={m.negative} />
                      )) : (
                        <div className="space-y-2.5 pt-2">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        </div>
                      )}
                    </div>

                    {/* View button */}
                    <button
                      onClick={() => viewPdf(s.key)}
                      disabled={downloading === s.key}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        s.key === 'trial-balance' && 'text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200',
                        s.key === 'income-statement' && 'text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200',
                        s.key === 'balance-sheet' && 'text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200',
                        s.key === 'cash-flow' && 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200',
                        s.key === 'equity' && 'text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200',
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{downloading === s.key ? 'Opening...' : 'View Report'}</span>
                      <Download className={cn('w-3.5 h-3.5 ml-auto opacity-50', downloading === s.key && 'animate-bounce')} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
