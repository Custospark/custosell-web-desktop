import { useCallback, useRef, useState, useMemo } from 'react';
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../../../shared/components/cards/Card';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import {
  CHART_THEME, ChartTooltipRow, ChartTooltipShell, chartAverage,
} from '../../../shared/components/charts/chartPrimitives';
import { useAccountingPeriods, useRatioTrends } from '../api/AccountingQueries';
import type { RatioSet } from '../api/AccountingTypes';
import {
  Percent, Droplets, TrendingUp, Shield, Zap, Download, FileSpreadsheet, Image,
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

export default function RatiosPage() {
  const [periodId, setPeriodId] = useState<string>('');
  const [selectedRatioKey, setSelectedRatioKey] = useState<string | null>(null);

  const { data: periods } = useAccountingPeriods();
  const { data: trends, isLoading } = useRatioTrends('monthly', 25);

  // Derive current ratios from the selected period in trends data
  const ratios = useMemo(() => {
    if (!trends?.length) return undefined;
    const id = periodId ? Number(periodId) : undefined;
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
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel
            </Button>
            <Button variant="outline" size="sm">
              <Image className="w-4 h-4 mr-1.5" />Image
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
    </div>
  );
}
