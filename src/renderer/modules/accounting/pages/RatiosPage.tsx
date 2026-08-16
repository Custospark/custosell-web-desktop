import { useCallback, useState, useMemo } from 'react';
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { AccountingDateRange } from '../ui/AccountingDateRange';
import {
  CHART_THEME, ChartTooltipRow, ChartTooltipShell, chartAverage,
} from '../../../shared/components/charts/chartPrimitives';
import { useRatioTrends, useRatios } from '../api/AccountingQueries';
import { currentMonthBounds, dateRangeToReportParams, buildReportQueryString, type ReportPeriodParams } from '../utils/periodSelectionUtils';
import { useReportDownload } from '../../dashboard/DashboardQueries';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import {
  Percent, Droplets, TrendingUp, Shield, Zap, Download, FileSpreadsheet, RefreshCw,
  Lightbulb, AlertTriangle, AlertCircle, CheckCircle,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatRatioValue, getHealth, getRatioValue, RATIO_DEFS, RATIO_INFO } from '../ui/ratioDefinitions';
import type { RatioDef } from '../ui/ratioTypes';
import { RatioLine } from '../ui/RatioLine';

const CATEGORY_META: Record<string, { title: string; icon: React.ElementType; accent: 'blue' | 'green' | 'purple' | 'amber' }> = {
  liquidity: { title: 'Liquidity', icon: Droplets, accent: 'blue' },
  profitability: { title: 'Profitability', icon: TrendingUp, accent: 'green' },
  solvency: { title: 'Solvency', icon: Shield, accent: 'purple' },
  efficiency: { title: 'Efficiency', icon: Zap, accent: 'amber' },
};

export default function RatiosPage() {
  const bounds = currentMonthBounds();
  const [reportParams, setReportParams] = useState<ReportPeriodParams | undefined>(
    dateRangeToReportParams(bounds.from, bounds.to),
  );
  const [selectedRatioKey, setSelectedRatioKey] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'xlsx'>('pdf');

  const { data: trends, isLoading: trendsLoading } = useRatioTrends('monthly', 12);
  const downloadReport = useReportDownload();

  const { data: ratios, isLoading: ratiosLoading, isError: ratiosError } = useRatios(reportParams);

  const isLoading = trendsLoading && ratiosLoading;
  const isError = ratiosError && !ratios;

  function openDownload() {
    setDownloadFormat('pdf');
    setDownloadOpen(true);
  }

  function doDownload() {
    if (!reportParams) return;

    const query = buildReportQueryString(reportParams).replace(/^\?/, '');
    const search = new URLSearchParams(query);
    search.set('format', downloadFormat);
    downloadReport(ACCOUNTING.EXPORT('ratios'), search, `ratios.${downloadFormat}`);
    setDownloadOpen(false);
  }

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
    if (health === 'warning') return `${info.fullName} needs attention.${changeStr}. ${def.higherIsBetter ? 'Below the ideal threshold - consider corrective action.' : 'Leverage is increasing - monitor closely.'}`;
    return `${info.fullName} is in the danger zone.${changeStr}. ${def.higherIsBetter ? 'Immediate action recommended to improve this metric.' : 'High leverage - consider reducing debt urgently.'}`;
  }

  const handleRatioClick = useCallback((key: string) => {
    setSelectedRatioKey((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">Financial Ratios Dashboard</h1>
              <p className="text-sm text-gray-500">Key performance indicators and trends</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Reload
            </Button>
            <Button variant="outline" size="sm" onClick={openDownload}>
              <Download className="w-4 h-4 mr-1.5" />Download
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-end gap-4">
        <AccountingDateRange
          value={reportParams}
          onChange={setReportParams}
        />
      </div>

      {isLoading ? (
        <CustosellLoader />
      ) : isError ? (
        <Card><p className="text-sm text-red-500 text-center py-8">Failed to load ratios. Check your connection and try again.</p></Card>
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
                    const rec = ratios?.recommendations?.find((r) => r.ratio_key === def.key);
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
          {trendsLoading ? (
            <CustosellLoader />
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
              Click on any ratio above to see its trend over time
            </div>
          )}
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

      <Modal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} title="Download Ratios Report" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select the format for your report.</p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Period: {reportParams?.date_from ?? 'start'} to {reportParams?.date_to ?? 'now'}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setDownloadFormat('pdf')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'pdf' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}
            >
              <Download className="w-4 h-4 mx-auto mb-1" />
              PDF Document
            </button>
            <button
              onClick={() => setDownloadFormat('xlsx')}
              className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
                downloadFormat === 'xlsx' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}
            >
              <FileSpreadsheet className="w-4 h-4 mx-auto mb-1" />
              Excel Spreadsheet
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
