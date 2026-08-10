import { useState } from 'react';
import { Package, TrendingUp, Boxes, AlertTriangle, Layers, RefreshCw } from 'lucide-react';
import { useInventoryOverview } from './api/overview/InventoryOverviewQueries';
import type { ValuationTier, InventoryOverviewData } from './api/overview/InventoryOverviewTypes';
import { useLocations } from '../settings/api/settings/LocationQueries';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { DashboardStatCard } from '../../shared/components/cards/DashboardStatCard';
import { type CardColor } from '../../shared/components/cards/statCardStyles';
import { OverviewDonut } from './ui/overview/OverviewDonut';
import { InventoryTrendChart } from './ui/overview/OverviewTrendChart';
import { OverviewRankings } from './ui/overview/OverviewRankings';
import { OverviewBranchTable } from './ui/overview/OverviewBranchTable';
import { OverviewStatusLists } from './ui/overview/OverviewStatusLists';

const TIER_OPTIONS: { value: ValuationTier; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
];

const TIER_LABEL: Record<ValuationTier, string> = { retail: 'Retail', wholesale: 'Wholesale' };

interface CardDef {
  label: string;
  value: string;
  icon: React.ElementType;
  color: CardColor;
  badge: string;
  sub?: string;
}

function buildStats(d: InventoryOverviewData, tier: ValuationTier): CardDef[] {
  const s = d.summary;
  const profit = tier === 'retail' ? s.profit_retail : s.profit_wholesale;
  const pct = (tier === 'retail' ? s.profit_retail_pct : s.profit_wholesale_pct);
  const alerts = s.low_stock_count + s.out_of_stock_count + s.dead_stock_count + s.zero_cost_sku_count;

  return [
    {
      label: 'Stock Value (Cost)',
      value: formatCurrency(s.value_cost),
      sub: `Valuation as of ${d.as_of}`,
      icon: Package,
      color: 'blue',
      badge: 'Cost',
    },
    {
      label: 'Projected Profit',
      value: formatCurrency(profit),
      sub: `${TIER_LABEL[tier]} tier${pct !== null ? ` · ${pct}% ROI` : ''}`,
      icon: TrendingUp,
      color: 'green',
      badge: TIER_LABEL[tier],
    },
    {
      label: 'Units on Hand',
      value: s.stock_quantity.toLocaleString(),
      sub: `${s.stocked_product_count} of ${s.product_count} products stocked`,
      icon: Boxes,
      color: 'amber',
      badge: 'Units',
    },
    {
      label: 'Needs Attention',
      value: alerts.toLocaleString(),
      sub: `${s.low_stock_count} low · ${s.out_of_stock_count} out · ${s.dead_stock_count} dead · ${s.zero_cost_sku_count} no-cost`,
      icon: AlertTriangle,
      color: 'purple',
      badge: 'Alerts',
    },
  ];
}

export default function OverviewPage() {
  const [tier, setTier] = useState<ValuationTier>('retail');
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const { data: locations = [] } = useLocations();
  const { data, isLoading, isError, refetch } = useInventoryOverview(locationId);

  if (isLoading) return <CustosellLoader message="Building inventory overview…" />;

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500 text-sm">Could not load inventory overview.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const d = data!;
  const branchName = locationId
    ? locations.find((l) => l.id === locationId)?.name
    : undefined;
  const scope = branchName ?? d.location_name ?? 'All branches';
  const showBranchFilter = locations.length > 1;
  const cards = buildStats(d, tier);

  const hasData = d.summary.value_cost > 0 || d.summary.product_count > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Inventory Overview</h1>
            <p className="text-sm text-gray-500">
              Stock valuation, projected profit and movement across your catalogue
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
            <Layers className="w-3.5 h-3.5" /> {scope}
          </span>
          {showBranchFilter && (
            <select
              value={locationId ?? ''}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:h-9 sm:w-auto"
            >
              <option value="">All branches</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}
          <div className="flex w-full items-center gap-1.5 bg-gray-100 rounded-lg p-0.5 sm:w-auto">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTier(opt.value)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none',
                  tier === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <DashboardStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            color={card.color}
            badge={card.badge}
            sub={card.sub}
          />
        ))}
      </div>

      {hasData ? (
        <>
          <InventoryTrendChart
            data={d.trend}
            title="Stock Value · Last 12 Months"
            subtitle="Month-end value at current cost, reconstructed from the stock ledger"
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OverviewDonut
              data={d.by_category}
              title="Value by Category"
              subtitle="Current cost valuation per category"
              dataKey="value_cost"
              nameKey="category_name"
            />
            <OverviewDonut
              data={d.by_branch}
              title="Value by Branch"
              subtitle="Current cost valuation held at each location"
              dataKey="value_cost"
              nameKey="location_name"
            />
          </div>

          <OverviewRankings
            tier={tier}
            topProfit={d.top_profit}
            topMargin={d.top_margin}
            lowMargin={d.low_margin}
          />

          <OverviewBranchTable branches={d.by_branch} scopeLabel={scope} />

          <OverviewStatusLists
            low={d.low_stock}
            out={d.out_of_stock}
            dead={d.dead_stock}
            lowCount={d.summary.low_stock_count}
            outCount={d.summary.out_of_stock_count}
            deadCount={d.summary.dead_stock_count}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No stocked products yet. Add products with stock and a cost price to see your inventory overview.
          </p>
        </div>
      )}
    </div>
  );
}