import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { useTrialBalance, useIncomeStatement, useBalanceSheet, useAccountingPeriods, useCashFlow, useEquity } from '../api/AccountingQueries';
import { useReportDownload } from '../../dashboard/DashboardQueries';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { Printer, Scale, BarChart3, ClipboardList, ChevronDown, ChevronRight, CheckCircle, XCircle, Download, FileSpreadsheet, TrendingUp, PieChart } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import type { BusinessInfo } from '../../../app/store/slices/authSlice';
import type { AccountingPeriod } from '../api/AccountingTypes';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

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
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-white text-gray-900 shadow-sm border border-gray-200 ring-1 ring-gray-100'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{tab.label}</span>
      {active ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
    </button>
  );
}

interface SectionProps {
  periodId: string;
  periods: AccountingPeriod[] | undefined;
  business: BusinessInfo | null | undefined;
}

function ReportHeader({ business }: { business: BusinessInfo | null | undefined }) {
  if (!business?.name) return null;
  const fullLocation = [business.city, business.state, business.country].filter(Boolean).join(', ');

  return (
    <div className="text-center border-b-2 border-blue-700 pb-4 mb-4">
      <h1 className="text-xl font-bold uppercase tracking-wide text-blue-800">{business.name}</h1>
      {business.address && <p className="text-[11px] text-gray-500 mt-1">{business.address}</p>}
      {fullLocation && <p className="text-[11px] text-gray-500">{fullLocation}</p>}
      {(business.phone || business.email) && (
        <p className="text-[11px] text-gray-500">
          {[business.phone && `Tel: ${business.phone}`, business.email].filter(Boolean).join(' · ')}
        </p>
      )}
      {business.tax_id && <p className="text-[11px] text-gray-500">Tax ID: {business.tax_id}</p>}
    </div>
  );
}

function ReportTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-[11px] text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function TrialBalanceSection({ periodId, business }: SectionProps) {
  const { data: tb, isLoading, isError } = useTrialBalance(periodId ? Number(periodId) : undefined);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  if (isError) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load trial balance.</p></Card>;
  if (!tb) return <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>;

  const periodName = tb.period?.name ?? `Period #${periodId}`;
  const periodDates = tb.period?.start_date
    ? `From ${formatShiftDate(tb.period.start_date)} to ${formatShiftDate(tb.period.end_date)}`
    : '';

  return (
    <Card className="print:shadow-none">
      <ReportHeader business={business} />
      <ReportTitle title="Trial Balance" subtitle={[periodName, periodDates].filter(Boolean).join(' — ')} />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-2 pr-2 font-semibold text-gray-700">Account</th>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Code</th>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
            <th className="text-right py-2 px-2 font-semibold text-gray-700">Debit</th>
            <th className="text-right py-2 pl-2 font-semibold text-gray-700">Credit</th>
          </tr>
        </thead>
        <tbody>
          {tb.accounts?.map((acc) => (
            <tr key={acc.account_id} className="border-b border-gray-200">
              <td className="py-2 pr-2 text-gray-800">{acc.name}</td>
              <td className="py-2 px-2 text-gray-500 font-mono">{acc.code}</td>
              <td className="py-2 px-2 text-gray-500">{acc.type}</td>
              <td className="py-2 px-2 text-right font-mono tabular-nums">
                {acc.debit_balance > 0 ? fmt(acc.debit_balance) : '-'}
              </td>
              <td className="py-2 pl-2 text-right font-mono tabular-nums">
                {acc.credit_balance > 0 ? fmt(acc.credit_balance) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-800 font-semibold">
            <td colSpan={3} className="py-3 pr-2 text-gray-900 text-right">Totals</td>
            <td className="py-3 px-2 text-right font-mono tabular-nums text-gray-900">{fmt(tb.total_debits)}</td>
            <td className="py-3 pl-2 text-right font-mono tabular-nums text-gray-900">{fmt(tb.total_credits)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-4 flex items-center justify-between text-sm border-t border-gray-200 pt-4">
        <span className="text-gray-500">
          Difference: <strong className="text-gray-900">{fmt(Math.abs(tb.total_debits - tb.total_credits))}</strong>
        </span>
        <span className={cn('inline-flex items-center gap-1.5 font-medium', tb.is_balanced ? 'text-green-600' : 'text-red-500')}>
          {tb.is_balanced ? <><CheckCircle className="w-4 h-4" /> Balanced</> : <><XCircle className="w-4 h-4" /> Not Balanced</>}
        </span>
      </div>
    </Card>
  );
}

function IncomeStatementSection({ periodId, periods, business }: SectionProps) {
  const { data: stmt, isLoading, isError } = useIncomeStatement(periodId ? Number(periodId) : undefined);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  if (isError) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load income statement.</p></Card>;
  if (!stmt) return <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>;

  const periodEnd = periodId && periods?.find(p => String(p.id) === periodId)
    ? formatShiftDate(periods.find(p => String(p.id) === periodId)!.end_date)
    : '';

  return (
    <Card className="print:shadow-none">
      <ReportHeader business={business} />
      <ReportTitle title="Income Statement" subtitle={periodEnd ? `For the period ended ${periodEnd}` : undefined} />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Revenue</h4>
          {stmt.sections?.revenue?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-semibold border-b-2 border-gray-300">
            <span>Total Revenue</span>
            <span className="font-mono tabular-nums">{fmt(stmt.total_revenue)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Cost of Goods Sold</h4>
          {stmt.sections?.cost_of_goods_sold?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-semibold border-b-2 border-gray-300">
            <span>Total COGS</span>
            <span className="font-mono tabular-nums">{fmt(stmt.total_cost_of_goods_sold)}</span>
          </div>
        </div>

        <div className="flex justify-between py-3 text-base font-bold border-b-2 border-gray-800">
          <span>Gross Profit</span>
          <span className="font-mono tabular-nums">{fmt(stmt.gross_profit)}</span>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Operating Expenses</h4>
          {stmt.sections?.operating_expenses?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-semibold border-b-2 border-gray-300">
            <span>Total Operating Expenses</span>
            <span className="font-mono tabular-nums">{fmt(stmt.total_operating_expenses)}</span>
          </div>
        </div>

        <div className="flex justify-between py-3 text-base font-bold border-b-2 border-gray-800">
          <span>Operating Income (EBIT)</span>
          <span className="font-mono tabular-nums">{fmt(stmt.operating_income)}</span>
        </div>

        <div className="flex justify-between py-3 text-lg font-bold text-gray-900">
          <span>Net Income</span>
          <span className={cn('font-mono tabular-nums', stmt.net_income >= 0 ? 'text-green-600' : 'text-red-600')}>
            {fmt(stmt.net_income)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function BalanceSheetSection({ periodId, periods, business }: SectionProps) {
  const { data: bs, isLoading, isError } = useBalanceSheet(periodId ? Number(periodId) : undefined);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  if (isError) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load balance sheet.</p></Card>;
  if (!bs) return <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>;

  const periodEnd = periodId && periods?.find(p => String(p.id) === periodId)
    ? formatShiftDate(periods.find(p => String(p.id) === periodId)!.end_date)
    : '';

  return (
    <Card className="print:shadow-none">
      <ReportHeader business={business} />
      <ReportTitle title="Balance Sheet" subtitle={periodEnd ? `As of ${periodEnd}` : undefined} />

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 border-b-2 border-gray-800 pb-2">ASSETS</h4>
          {bs.sections?.assets?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Assets</span>
            <span className="font-mono tabular-nums">{fmt(bs.total_assets)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 border-b-2 border-gray-800 pb-2">LIABILITIES</h4>
          {bs.sections?.liabilities?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Liabilities</span>
            <span className="font-mono tabular-nums">{fmt(bs.total_liabilities)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 border-b-2 border-gray-800 pb-2">EQUITY</h4>
          {bs.sections?.equity?.map((r) => (
            <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{r.name}</span>
              <span className="font-mono tabular-nums">{fmt(r.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Equity</span>
            <span className="font-mono tabular-nums">{fmt(bs.total_equity)}</span>
          </div>
        </div>

        <div className="flex justify-between py-3 text-base font-bold border-t-2 border-gray-800">
          <span>A = L + E</span>
          <span className={cn('inline-flex items-center gap-2', bs.is_balanced ? 'text-green-600' : 'text-red-500')}>
            {fmt(bs.total_assets)} = {fmt(bs.total_liabilities + bs.total_equity)}
            {bs.is_balanced ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CashFlowSection({ periodId, periods, business }: SectionProps) {
  const { data: cf, isLoading, isError } = useCashFlow(periodId ? Number(periodId) : undefined);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  if (isError) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load cash flow statement.</p></Card>;
  if (!cf) return <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>;

  const periodEnd = periodId && periods?.find(p => String(p.id) === periodId)
    ? formatShiftDate(periods.find(p => String(p.id) === periodId)!.end_date)
    : '';

  return (
    <Card className="print:shadow-none">
      <ReportHeader business={business} />
      <ReportTitle title="Cash Flow Statement" subtitle={periodEnd ? `For the period ended ${periodEnd}` : undefined} />

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b-2 pb-2 text-green-700 border-green-800">
            Operating Activities
          </h4>
          {cf.operating.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-mono tabular-nums">{fmt(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Operating Activities</span>
            <span className="font-mono tabular-nums">{fmt(cf.operating.total)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b-2 pb-2 text-blue-700 border-blue-800">
            Investing Activities
          </h4>
          {cf.investing.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-mono tabular-nums">{fmt(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Investing Activities</span>
            <span className="font-mono tabular-nums">{fmt(cf.investing.total)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b-2 pb-2 text-purple-700 border-purple-800">
            Financing Activities
          </h4>
          {cf.financing.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-1.5 text-sm border-b border-gray-100">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-mono tabular-nums">{fmt(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-bold border-b-2 border-gray-300">
            <span>Total Financing Activities</span>
            <span className="font-mono tabular-nums">{fmt(cf.financing.total)}</span>
          </div>
        </div>

        <div className="flex justify-between py-3 text-base font-bold border-t-2 border-gray-800">
          <span>Net Change in Cash</span>
          <span className={cn('font-mono tabular-nums', cf.net_change >= 0 ? 'text-green-600' : 'text-red-600')}>
            {fmt(cf.net_change)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function EquitySection({ periodId, periods, business }: SectionProps) {
  const { data: eq, isLoading, isError } = useEquity(periodId ? Number(periodId) : undefined);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  if (isError) return <Card><p className="text-sm text-red-500 text-center py-8">Failed to load equity statement.</p></Card>;
  if (!eq) return <Card><p className="text-sm text-gray-400 text-center py-8">No data for this period.</p></Card>;

  const periodEnd = periodId && periods?.find(p => String(p.id) === periodId)
    ? formatShiftDate(periods.find(p => String(p.id) === periodId)!.end_date)
    : '';

  return (
    <Card className="print:shadow-none">
      <ReportHeader business={business} />
      <ReportTitle title="Statement of Changes in Equity" subtitle={periodEnd ? `For the period ended ${periodEnd}` : undefined} />

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 border-b-2 border-gray-800 pb-2">Equity Components</h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-2 font-semibold text-gray-700">Account</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Code</th>
                <th className="text-right py-2 pl-2 font-semibold text-gray-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {eq.equity_components?.map((comp, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-2 text-gray-800">{comp.account_name}</td>
                  <td className="py-2 px-2 text-gray-500 font-mono">{comp.account_code}</td>
                  <td className="py-2 pl-2 text-right font-mono tabular-nums">{fmt(comp.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 border-b-2 border-gray-800 pb-2">Retained Earnings</h4>
          <div className="space-y-1.5">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-700">Opening Retained Earnings</span>
              <span className="font-mono tabular-nums">{fmt(eq.opening_retained_earnings)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-700">Net Income (Loss)</span>
              <span className="font-mono tabular-nums">{fmt(eq.net_income)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-700">Dividends</span>
              <span className="font-mono tabular-nums">({fmt(eq.dividends)})</span>
            </div>
            <div className="flex justify-between py-2 text-sm font-semibold border-t border-gray-300">
              <span>Closing Retained Earnings</span>
              <span className="font-mono tabular-nums">{fmt(eq.closing_retained_earnings)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between py-3 text-base font-bold border-t-2 border-gray-800">
          <span>Total Equity</span>
          <span className="font-mono tabular-nums text-green-600">{fmt(eq.total_equity)}</span>
        </div>
      </div>
    </Card>
  );
}

export default function FinancialStatementsPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const { data: periods } = useAccountingPeriods();
  const business = useAppSelector((s) => s.auth.user?.business);
  const downloadReport = useReportDownload();

  // Resolve period_id: use last ID for quarter selection
  const effectivePeriodId = useMemo(() => {
    const ids = periodId ? periodId.split(',').map(Number).filter(Boolean) : [];
    return ids.length > 0 ? ids[ids.length - 1] : undefined;
  }, [periodId]);

  function toggleTab(tab: TabKey) {
    setActiveTab((prev) => prev === tab ? null : tab);
  }

  function downloadPdf(type: string) {
    const params = new URLSearchParams();
    if (effectivePeriodId) params.set('period_id', String(effectivePeriodId));
    params.set('format', 'pdf');
    downloadReport(ACCOUNTING.EXPORT(type), params, `${type}.pdf`);
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
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadPdf('trial-balance')}>
              <Download className="w-4 h-4 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const params = new URLSearchParams();
              if (effectivePeriodId) params.set('period_id', String(effectivePeriodId));
              params.set('format', 'xlsx');
              downloadReport(ACCOUNTING.EXPORT('trial-balance'), params, 'trial-balance.xlsx');
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <PeriodSelector
          periods={periods}
          value={periodId}
          onChange={setPeriodId}
          className="w-full"
        />
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key}
            onClick={() => toggleTab(tab.key)}
          />
        ))}
      </div>

      {activeTab === 'trial-balance' && <TrialBalanceSection periodId={effectivePeriodId ? String(effectivePeriodId) : ''} periods={periods} business={business} />}
      {activeTab === 'income-statement' && <IncomeStatementSection periodId={effectivePeriodId ? String(effectivePeriodId) : ''} periods={periods} business={business} />}
      {activeTab === 'balance-sheet' && <BalanceSheetSection periodId={effectivePeriodId ? String(effectivePeriodId) : ''} periods={periods} business={business} />}
      {activeTab === 'cash-flow' && <CashFlowSection periodId={effectivePeriodId ? String(effectivePeriodId) : ''} periods={periods} business={business} />}
      {activeTab === 'equity' && <EquitySection periodId={effectivePeriodId ? String(effectivePeriodId) : ''} periods={periods} business={business} />}

      {!activeTab && (
        <Card>
          <div className="h-32 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Click a report above to view it here
          </div>
        </Card>
      )}
    </div>
  );
}
