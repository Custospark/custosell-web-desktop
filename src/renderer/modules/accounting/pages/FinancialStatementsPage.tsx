import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { AccountingDateRange } from '../ui/AccountingDateRange';
import { useTrialBalance, useIncomeStatement, useBalanceSheet, useCashFlow, useEquity } from '../api/AccountingQueries';
import { currentMonthBounds, dateRangeToReportParams, buildReportQueryString, type ReportPeriodParams } from '../utils/periodSelectionUtils';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { Scale, BarChart3, ClipboardList, TrendingUp, PieChart, FileText, Download } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

import { motion } from 'framer-motion';

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

type MetricItem = { label: string; value: string; positive?: boolean; negative?: boolean };

function MetricRow({ label, value, positive, negative }: MetricItem) {
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
  const bounds = currentMonthBounds();
  const [reportParams, setReportParams] = useState<ReportPeriodParams | undefined>(
    dateRangeToReportParams(bounds.from, bounds.to),
  );

  const [downloading, setDownloading] = useState<string | null>(null);

  function viewPdf(type: string) {
    if (!reportParams) return;
    setDownloading(type);

    const query = buildReportQueryString(reportParams).replace(/^\?/, '');
    const params = Object.fromEntries(new URLSearchParams(`${query}&format=pdf`));

    axiosInstance.get(ACCOUNTING.EXPORT(type), { params, responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setDownloading(null);
      })
      .catch(() => setDownloading(null));
  }

  const { data: tb, isError: tbError } = useTrialBalance(reportParams);
  const { data: stmt, isError: stmtError } = useIncomeStatement(reportParams);
  const { data: bs, isError: bsError } = useBalanceSheet(reportParams);
  const { data: cf, isError: cfError } = useCashFlow(reportParams);
  const { data: eq, isError: eqError } = useEquity(reportParams);

  const isError = Boolean(reportParams) && (tbError || stmtError || bsError || cfError || eqError);

  const isLoading = reportParams && !isError && !tb && !stmt && !bs && !cf && !eq;

  const statements: { key: string; data: unknown; metrics: MetricItem[]; badge: { label: string; type: 'success' | 'danger' | 'warning' | 'info' } | null }[] = [
    {
      key: 'trial-balance',
      data: tb,
      metrics: tb ? [
        { label: 'Total Debits', value: formatCurrency(tb.total_debits) },
        { label: 'Total Credits', value: formatCurrency(tb.total_credits) },
      ] : [],
      badge: tb ? { label: tb.is_balanced ? 'Balanced' : 'Unbalanced', type: tb.is_balanced ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'balance-sheet',
      data: bs,
      metrics: bs ? [
        { label: 'Assets', value: formatCurrency(bs.total_assets) },
        { label: 'Liabilities', value: formatCurrency(bs.total_liabilities) },
        { label: 'Equity', value: formatCurrency(bs.total_equity) },
      ] : [],
      badge: bs ? { label: bs.is_balanced ? 'A = L + E' : 'Out of Balance', type: bs.is_balanced ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'income-statement',
      data: stmt,
      metrics: stmt ? [
        { label: 'Revenue', value: formatCurrency(stmt.total_revenue) },
        { label: 'Net Income', value: formatCurrency(stmt.net_income), positive: stmt.net_income >= 0, negative: stmt.net_income < 0 },
      ] : [],
      badge: stmt ? { label: stmt.net_income >= 0 ? 'Profitable' : 'Net Loss', type: stmt.net_income >= 0 ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'cash-flow',
      data: cf,
      metrics: cf ? [
        { label: 'Operating', value: formatCurrency(cf.operating.total) },
        { label: 'Net Change', value: formatCurrency(cf.net_change), positive: cf.net_change >= 0, negative: cf.net_change < 0 },
      ] : [],
      badge: cf ? { label: cf.net_change >= 0 ? 'Positive' : 'Negative', type: cf.net_change >= 0 ? 'success' as const : 'danger' as const } : null,
    },
    {
      key: 'equity',
      data: eq,
      metrics: eq ? [
        { label: 'Opening RE', value: formatCurrency(eq.opening_retained_earnings) },
        { label: 'Net Income', value: formatCurrency(eq.net_income), positive: eq.net_income >= 0, negative: eq.net_income < 0 },
        { label: 'Total Equity', value: formatCurrency(eq.total_equity) },
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
              <p className="text-sm text-gray-500">View your financial reports for the selected period</p>
            </div>
          </div>
          <div>
            <AccountingDateRange
              value={reportParams}
              onChange={setReportParams}
            />
          </div>
        </div>
      </Card>

      {isError ? (
        <Card>
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Download className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">Could not load financial statements</p>
            <p className="text-sm text-gray-500 mt-1">The selected date range may fall outside your accounting records. Pick a range within your business&apos;s active periods and search again.</p>
            <p className="text-xs text-gray-400 mt-2">
              {reportParams?.date_from ?? 'start'} to {reportParams?.date_to ?? 'now'}
            </p>
          </div>
        </Card>
      ) : isLoading ? (
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
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {reportParams?.date_from ?? 'start'} to {reportParams?.date_to ?? 'now'}
                          </p>
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
