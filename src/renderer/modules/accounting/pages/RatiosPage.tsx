import { useCallback, useRef, useState, useMemo } from 'react';
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../../../shared/components/cards/Card';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import {
  CHART_THEME, ChartTooltipRow, ChartTooltipShell, chartAverage,
} from '../../../shared/components/charts/chartPrimitives';
import { useAccountingPeriods, useRatioTrends } from '../api/AccountingQueries';
import { useReportDownload } from '../../dashboard/DashboardQueries';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import type { RatioSet } from '../api/AccountingTypes';
import {
  Percent, Droplets, TrendingUp, Shield, Zap, Download, FileSpreadsheet, RefreshCw,
  Lightbulb, AlertTriangle, AlertCircle, CheckCircle, Info,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

type RatioFormat = 'decimal' | 'percent' | 'times';
type HealthStatus = 'healthy' | 'warning' | 'danger';

interface RatioDef {
  category: keyof RatioSet;
  key: string;
  label: string;
  format: RatioFormat;
  healthyThreshold: number;
  warningThreshold: number;
  higherIsBetter: boolean;
}

const RATIO_DEFS: RatioDef[] = [
  { category: 'liquidity', key: 'current_ratio', label: 'Current Ratio', format: 'decimal', healthyThreshold: 2, warningThreshold: 1, higherIsBetter: true },
  { category: 'liquidity', key: 'quick_ratio', label: 'Quick Ratio', format: 'decimal', healthyThreshold: 1, warningThreshold: 0.5, higherIsBetter: true },
  { category: 'liquidity', key: 'cash_ratio', label: 'Cash Ratio', format: 'decimal', healthyThreshold: 0.5, warningThreshold: 0.3, higherIsBetter: true },
  { category: 'profitability', key: 'gross_profit_margin', label: 'Gross Margin', format: 'percent', healthyThreshold: 40, warningThreshold: 20, higherIsBetter: true },
  { category: 'profitability', key: 'net_profit_margin', label: 'Net Margin', format: 'percent', healthyThreshold: 15, warningThreshold: 5, higherIsBetter: true },
  { category: 'profitability', key: 'return_on_assets', label: 'ROA', format: 'percent', healthyThreshold: 10, warningThreshold: 5, higherIsBetter: true },
  { category: 'profitability', key: 'return_on_equity', label: 'ROE', format: 'percent', healthyThreshold: 15, warningThreshold: 10, higherIsBetter: true },
  { category: 'solvency', key: 'debt_to_equity', label: 'D/E', format: 'decimal', healthyThreshold: 1, warningThreshold: 2, higherIsBetter: false },
  { category: 'solvency', key: 'debt_ratio', label: 'D/A', format: 'decimal', healthyThreshold: 0.5, warningThreshold: 0.7, higherIsBetter: false },
  { category: 'solvency', key: 'interest_coverage_ratio', label: 'ICR', format: 'times', healthyThreshold: 3, warningThreshold: 1.5, higherIsBetter: true },
  { category: 'efficiency', key: 'asset_turnover', label: 'Asset T/O', format: 'times', healthyThreshold: 1.5, warningThreshold: 0.8, higherIsBetter: true },
  { category: 'efficiency', key: 'inventory_turnover', label: 'Inv T/O', format: 'times', healthyThreshold: 6, warningThreshold: 3, higherIsBetter: true },
  { category: 'efficiency', key: 'accounts_receivable_turnover', label: 'AR T/O', format: 'times', healthyThreshold: 8, warningThreshold: 4, higherIsBetter: true },
];

const RATIO_INFO: Record<string, { fullName: string; meaning: string; formula: string; importance: string }> = {
  current_ratio: {
    fullName: 'Current Ratio',
    meaning: 'Measures your ability to pay short-term obligations with short-term assets.',
    formula: 'Current Assets ÷ Current Liabilities',
    importance: 'A ratio below 1.0 means liabilities exceed assets — risk of insolvency. Above 2.0 is healthy.',
  },
  quick_ratio: {
    fullName: 'Quick Ratio (Acid Test)',
    meaning: 'Like the current ratio but excludes inventory. Tests immediate liquidity.',
    formula: '(Current Assets − Inventory) ÷ Current Liabilities',
    importance: 'Above 1.0 means you can pay debts without selling inventory.',
  },
  cash_ratio: {
    fullName: 'Cash Ratio',
    meaning: 'The most conservative liquidity measure — only cash and equivalents.',
    formula: '(Cash + Bank) ÷ Current Liabilities',
    importance: 'Above 0.5 means you have emergency cash reserves.',
  },
  gross_profit_margin: {
    fullName: 'Gross Profit Margin',
    meaning: 'Percentage of revenue retained after paying for products/services sold.',
    formula: '(Revenue − COGS) ÷ Revenue × 100',
    importance: 'Shows pricing power and cost efficiency. Below 20% means costs consume most of your revenue.',
  },
  net_profit_margin: {
    fullName: 'Net Profit Margin',
    meaning: 'Percentage of revenue that becomes profit after ALL expenses.',
    formula: 'Net Income ÷ Revenue × 100',
    importance: 'The bottom line. Above 15% is excellent.',
  },
  return_on_assets: {
    fullName: 'Return on Assets (ROA)',
    meaning: 'How efficiently your assets generate profit.',
    formula: 'Net Income ÷ Total Assets × 100',
    importance: 'Measures management effectiveness. Below 5% suggests assets are underperforming.',
  },
  return_on_equity: {
    fullName: 'Return on Equity (ROE)',
    meaning: 'Return generated on shareholders\' invested capital.',
    formula: 'Net Income ÷ Shareholders\' Equity × 100',
    importance: 'Above 15% is excellent. Below 10% may not justify the risk of owning the business.',
  },
  debt_to_equity: {
    fullName: 'Debt-to-Equity Ratio (D/E)',
    meaning: 'How much debt vs equity the business uses to finance operations.',
    formula: 'Total Liabilities ÷ Shareholders\' Equity',
    importance: 'Above 2.0 means heavy debt reliance — higher risk in downturns. Below 1.0 is conservative.',
  },
  debt_ratio: {
    fullName: 'Debt Ratio (D/A)',
    meaning: 'Proportion of assets financed by debt.',
    formula: 'Total Liabilities ÷ Total Assets',
    importance: 'Above 0.5 means creditors own more than half the assets.',
  },
  interest_coverage_ratio: {
    fullName: 'Interest Coverage Ratio (ICR)',
    meaning: 'How many times operating profit can cover interest payments.',
    formula: 'Operating Income ÷ Interest Expense',
    importance: 'Below 1.5 means you risk defaulting on debt. Above 3.0 is comfortable.',
  },
  asset_turnover: {
    fullName: 'Asset Turnover Ratio',
    meaning: 'How efficiently assets generate sales revenue.',
    formula: 'Sales ÷ Total Assets',
    importance: 'Below 0.8 means assets are underutilized. Above 1.5 indicates strong efficiency.',
  },
  inventory_turnover: {
    fullName: 'Inventory Turnover Ratio',
    meaning: 'How many times inventory is sold and replaced in a period.',
    formula: 'COGS ÷ Average Inventory',
    importance: 'Below 3x signals excess inventory tying up cash. Above 6x is healthy.',
  },
  accounts_receivable_turnover: {
    fullName: 'Accounts Receivable Turnover (AR T/O)',
    meaning: 'How quickly customers pay their debts.',
    formula: 'Net Sales ÷ Average Accounts Receivable',
    importance: 'Below 4x means slow collections straining cash flow.',
  },
};

function getHealth(value: number | null, def: RatioDef): HealthStatus {
  if (value === null || value === undefined) return 'danger';
  if (def.higherIsBetter) {
    if (value >= def.healthyThreshold) return 'healthy';
    if (value >= def.warningThreshold) return 'warning';
    return 'danger';
  }
  if (value <= def.healthyThreshold) return 'healthy';
  if (value <= def.warningThreshold) return 'warning';
  return 'danger';
}

function getRatioValue(ratios: RatioSet | undefined, category: keyof RatioSet, key: string): number | null {
  if (!ratios) return null;
  const cat = ratios[category];
  if (!cat) return null;
  return (cat as Record<string, number | null>)[key] ?? null;
}

function formatRatioValue(value: number, format: RatioFormat): string {
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (format === 'times') return `${value.toFixed(1)}x`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function HealthDot({ status }: { status: HealthStatus }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full inline-block shrink-0',
        status === 'healthy' && 'bg-green-500',
        status === 'warning' && 'bg-amber-400',
        status === 'danger' && 'bg-red-500',
      )}
    />
  );
}

function RatioLine({ def, value, selected, onClick, recommendation }: { def: RatioDef; value: number | null; selected: boolean; onClick: () => void; recommendation?: { message: string; action: string; priority: string } | null }) {
  const health = getHealth(value, def);
  const formatted = value !== null ? formatRatioValue(value, def.format) : 'N/A';
  const info = RATIO_INFO[def.key];
  const [hovered, setHovered] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const [tipSide, setTipSide] = useState<'left' | 'right'>('left');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const iconColor = health === 'healthy' ? 'text-green-400' : health === 'warning' ? 'text-amber-400' : 'text-red-400';

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(true);
  }, []);

  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setHovered(false), 200);
  }, []);

  return (
    <div className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        onClick={onClick}
        onMouseEnter={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const tooltipW = 360;
          const spaceRight = window.innerWidth - rect.left;
          const onRight = spaceRight >= tooltipW;
          setTipSide(onRight ? 'left' : 'right');
          setTipPos({
            top: rect.bottom + 10,
            left: onRight ? rect.left : rect.right - tooltipW,
          });
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          selected
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HealthDot status={health} />
          <span className="truncate">{def.label}</span>
          <Info className={cn('w-3 h-3 shrink-0', iconColor)} />
        </div>
        <span className="font-semibold tabular-nums shrink-0">{formatted}</span>
      </button>
      {hovered && info && (
        <div
          className="fixed z-[9999] w-[360px] bg-white rounded-xl shadow-xl border border-blue-200 p-4 text-sm leading-relaxed space-y-2.5"
          style={{ top: tipPos.top, left: tipPos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {/* Arrow tip */}
          <div className={cn('absolute -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-200', tipSide === 'left' ? 'left-4' : 'right-4')} />
          <div className={cn('absolute -top-[7px] w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white', tipSide === 'left' ? 'left-4' : 'right-4')} />

          <p className="text-sm font-bold text-gray-900">{info.fullName}</p>
          <p className="text-xs text-gray-600 leading-relaxed">{info.meaning}</p>
          <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 border border-gray-100">{info.formula}</div>
          <p className="text-xs text-gray-500">{info.importance}</p>
          {value === null && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">Insufficient data — this ratio cannot be calculated until relevant accounts have transactions.</p>
          )}
          {recommendation && (
            <div className={cn(
              'rounded-lg px-3 py-2 text-xs border',
              recommendation.priority === 'high' ? 'bg-red-50 border-red-100 text-red-700' :
              recommendation.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-green-50 border-green-100 text-green-700',
            )}>
              <p className="font-semibold mb-0.5">Recommendation</p>
              <p>{recommendation.message}</p>
              <p className="mt-1 italic">{recommendation.action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORY_META: Record<string, { title: string; icon: React.ElementType; accent: 'blue' | 'green' | 'purple' | 'amber' }> = {
  liquidity: { title: 'Liquidity', icon: Droplets, accent: 'blue' },
  profitability: { title: 'Profitability', icon: TrendingUp, accent: 'green' },
  solvency: { title: 'Solvency', icon: Shield, accent: 'purple' },
  efficiency: { title: 'Efficiency', icon: Zap, accent: 'amber' },
};

export default function RatiosPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const [selectedRatioKey, setSelectedRatioKey] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'xlsx'>('pdf');

  const { data: periods } = useAccountingPeriods();
  const { data: trends, isLoading } = useRatioTrends('monthly', 12);
  const downloadReport = useReportDownload();

  const selectedPeriodName = periods?.find((p: any) => String(p.id) === periodId)?.name
    ?? (periodId ? `Period #${periodId}` : 'Latest period');

  function openDownload(format: 'pdf' | 'xlsx') {
    setDownloadFormat(format);
    setDownloadOpen(true);
  }

  function handleDownload() {
    const params = new URLSearchParams();
    const pid = periodId ? periodId.split(',')[0] : '';
    if (pid) params.set('period_id', pid);
    params.set('format', downloadFormat);
    downloadReport(ACCOUNTING.EXPORT('ratios'), params, `ratios.${downloadFormat}`);
    setDownloadOpen(false);
  }

  // Derive current ratios from the selected period in trends data
  const ratios = useMemo(() => {
    if (!trends?.length) return undefined;
    const ids = periodId ? periodId.split(',').map(Number).filter(Boolean) : [];
    
    if (ids.length > 1) {
      // Quarter mode: average the ratios across all months in the quarter
      const quarterRatios = ids
        .map((id) => trends.find((t: any) => t.period_id === id)?.ratios)
        .filter(Boolean);
      if (quarterRatios.length === 0) return undefined;
      
      const avgField = (cat: string, field: string) => {
        const vals = quarterRatios.map((r: any) => r[cat]?.[field]).filter((v: any) => v !== null && v !== undefined);
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
      };
      
      return {
        liquidity: {
          current_ratio: avgField('liquidity', 'current_ratio'),
          quick_ratio: avgField('liquidity', 'quick_ratio'),
          cash_ratio: avgField('liquidity', 'cash_ratio'),
        },
        profitability: {
          gross_profit_margin: avgField('profitability', 'gross_profit_margin'),
          net_profit_margin: avgField('profitability', 'net_profit_margin'),
          return_on_assets: avgField('profitability', 'return_on_assets'),
          return_on_equity: avgField('profitability', 'return_on_equity'),
        },
        solvency: {
          debt_to_equity: avgField('solvency', 'debt_to_equity'),
          debt_ratio: avgField('solvency', 'debt_ratio'),
          interest_coverage_ratio: avgField('solvency', 'interest_coverage_ratio'),
        },
        efficiency: {
          asset_turnover: avgField('efficiency', 'asset_turnover'),
          inventory_turnover: avgField('efficiency', 'inventory_turnover'),
          accounts_receivable_turnover: avgField('efficiency', 'accounts_receivable_turnover'),
        },
      } as RatioSet;
    }
    
    const id = ids.length === 1 ? ids[0] : undefined;
    const match = id ? trends.find((t: any) => t.period_id === id) : trends[trends.length - 1];
    return match?.ratios as RatioSet | undefined;
  }, [trends, periodId]);

  const selectedDef = selectedRatioKey
    ? RATIO_DEFS.find((d) => d.key === selectedRatioKey)
    : null;

  const trendData = useMemo(() => {
    if (!trends || !selectedDef) return [];
    return trends.map((item, i) => {
      const val = getRatioValue(item.ratios, selectedDef.category, selectedDef.key) ?? 0;
      const prev = i > 0 ? getRatioValue(trends[i - 1].ratios, selectedDef.category, selectedDef.key) ?? 0 : val;
      return { label: item.period_name, value: val, change: val - prev };
    });
  }, [trends, selectedDef]);

  const trendAvg = useMemo(() => chartAverage(trendData.map((d) => d.value)), [trendData]);

  function trendInsight(def: RatioDef, value: number, change: number): string {
    const info = RATIO_INFO[def.key];
    const direction = change > 0 ? '↑ improved by' : change < 0 ? '↓ declined by' : '→ stable';
    const changeStr = change !== 0 ? ` ${direction} ${Math.abs(change).toFixed(1)}` : ' → no change';
    const health = getHealth(value, def);
    if (health === 'healthy') return `${info.fullName} is healthy.${changeStr}. ${def.higherIsBetter ? 'Good trend maintained.' : 'Low leverage is safe.'}`;
    if (health === 'warning') return `${info.fullName} needs attention.${changeStr}. ${def.higherIsBetter ? 'Below the ideal threshold — consider corrective action.' : 'Leverage is increasing — monitor closely.'}`;
    return `${info.fullName} is in the danger zone.${changeStr}. ${def.higherIsBetter ? 'Immediate action recommended to improve this metric.' : 'High leverage — consider reducing debt urgently.'}`;
  }

  const handleRatioClick = (key: string) => {
    setSelectedRatioKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Financial Ratios Dashboard</h1>
              <p className="text-sm text-gray-500">Key performance indicators and trends</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Reload
            </Button>
            <Button variant="outline" size="sm" onClick={() => openDownload('pdf')}>
              <Download className="w-4 h-4 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => openDownload('xlsx')}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-end gap-4">
        <PeriodSelector
          periods={periods}
          value={periodId}
          onChange={setPeriodId}
          className="flex-1"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : ratios ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
            const defs = RATIO_DEFS.filter((d) => d.category === catKey);
            const Icon = meta.icon;
            return (
              <Card key={catKey} accent={meta.accent} hover padding={false}>
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">{meta.title}</h3>
                  </div>
                </div>
                <div className="p-2 space-y-0.5">
                  {defs.map((def) => {
                    const value = getRatioValue(ratios, def.category, def.key);
                    const selected = selectedRatioKey === def.key;
                    const rec = ratios?.recommendations?.find((r: any) => r.ratio_key === def.key);
                    return (
                      <RatioLine
                        key={def.key}
                        def={def}
                        value={value}
                        selected={selected}
                        onClick={() => handleRatioClick(def.key)}
                        recommendation={rec ?? null}
                      />
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Select a period to view ratios
          </div>
        </Card>
      )}

      {selectedDef && (() => {
        const info = RATIO_INFO[selectedDef.key];
        const latestVal = trendData.length > 0 ? trendData[trendData.length - 1].value : 0;
        const latestChange = trendData.length > 1 ? trendData[trendData.length - 1].change : 0;
        const latestHealth = getHealth(latestVal, selectedDef);
        const changeColor = latestChange > 0 ? 'text-green-600' : latestChange < 0 ? 'text-red-500' : 'text-gray-400';
        const changeArrow = latestChange > 0 ? '↑' : latestChange < 0 ? '↓' : '→';
        return (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800">{info?.fullName ?? selectedDef.label} Trend</h3>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  latestHealth === 'healthy' ? 'bg-green-100 text-green-700' :
                  latestHealth === 'warning' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700')}>{latestHealth}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
                {trendData.length} periods · monthly
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-lg font-bold tabular-nums', changeColor)}>
                {formatRatioValue(latestVal, selectedDef.format)}
              </p>
              <p className={cn('text-xs font-medium', changeColor)}>
                {changeArrow} {Math.abs(latestChange).toFixed(1)} vs prev
              </p>
            </div>
          </div>

          <ChartContainer className="h-72" minHeight={288}>
            {(size) => (
              <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ratioTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_THEME.fillStart} />
                      <stop offset="100%" stopColor={CHART_THEME.fillEnd} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: CHART_THEME.lineLight, strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as { label: string; value: number; change: number };
                      const health = getHealth(row.value, selectedDef);
                      const arrow = row.change > 0 ? '↑' : row.change < 0 ? '↓' : '→';
                      return (
                        <ChartTooltipShell title={row.label}>
                          <ChartTooltipRow label={selectedDef.label} value={formatRatioValue(row.value, selectedDef.format)} accent />
                          <ChartTooltipRow label="Change" value={`${arrow} ${Math.abs(row.change).toFixed(1)}`} muted />
                          <div className="border-t border-gray-100 pt-1.5 mt-1.5 text-[11px] text-gray-500 italic leading-relaxed max-w-[200px]">
                            {trendInsight(selectedDef, row.value, row.change)}
                          </div>
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  {trendAvg > 0 && (
                    <ReferenceLine y={trendAvg} stroke={CHART_THEME.reference} strokeDasharray="6 4"
                      label={{ value: 'Avg', position: 'insideTopRight', fill: CHART_THEME.reference, fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="value" stroke={CHART_THEME.line} strokeWidth={2.5}
                    fill="url(#ratioTrendFill)" dot={{ r: 3, fill: CHART_THEME.line, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: CHART_THEME.line, stroke: '#fff', strokeWidth: 2 }} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </Card>
        );
      })()}

      {!selectedDef && ratios && (
        <Card>
          <div className="h-32 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Click on any ratio above to see its trend over time
          </div>
        </Card>
      )}

      {ratios?.recommendations && ratios.recommendations.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Financial Insights & Recommendations</h2>
              <p className="text-sm text-gray-500">Actionable guidance based on your financial data</p>
            </div>
          </div>
          <div className="space-y-3">
            {ratios.recommendations.map((rec) => (
              <div
                key={rec.ratio_key}
                className={cn(
                  'p-4 rounded-lg border',
                  rec.priority === 'high' && 'border-red-200 bg-red-50',
                  rec.priority === 'medium' && 'border-amber-200 bg-amber-50',
                  rec.priority === 'low' && 'border-green-200 bg-green-50',
                )}
              >
                <div className="flex items-start gap-3">
                  {rec.priority === 'high' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  ) : rec.priority === 'medium' ? (
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{rec.label}</span>
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          rec.priority === 'high' && 'bg-red-100 text-red-700',
                          rec.priority === 'medium' && 'bg-amber-100 text-amber-700',
                          rec.priority === 'low' && 'bg-green-100 text-green-700',
                        )}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{rec.message}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Recommended action:</span> {rec.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} title="Download Ratios Report" size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <span className="text-gray-500">Period: </span>
            <span className="font-semibold text-gray-800">{selectedPeriodName}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDownloadFormat('pdf')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'pdf' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}
            >
              <Download className="w-4 h-4 mx-auto mb-1" />
              PDF
            </button>
            <button
              onClick={() => setDownloadFormat('xlsx')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'xlsx' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}
            >
              <FileSpreadsheet className="w-4 h-4 mx-auto mb-1" />
              Excel
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleDownload}>Download</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
