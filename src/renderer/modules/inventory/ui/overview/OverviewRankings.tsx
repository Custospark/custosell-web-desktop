import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import type { InventoryMarginItem, InventoryProfitItem, ValuationTier } from '../../api/overview/InventoryOverviewTypes';
import { OverviewCard } from './OverviewCard';
import { OverviewRankingList, type RankingRow } from './OverviewRankingList';

const TIER_LABEL: Record<ValuationTier, string> = { retail: 'Retail', wholesale: 'Wholesale' };

function profitRows(items: InventoryProfitItem[]): RankingRow[] {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.profit_retail)));
  return items.map((i) => ({
    name: i.name,
    sku: i.sku,
    metric: formatCurrency(i.profit_retail),
    secondary: `${formatCurrency(i.value_cost)} cost · ${i.stock_quantity} units`,
    share: (Math.abs(i.profit_retail) / max) * 100,
  }));
}

function marginRows(items: InventoryMarginItem[], tier: ValuationTier): RankingRow[] {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.margin_retail_pct)));
  return items.map((i) => ({
    name: i.name,
    sku: i.sku,
    metric: `${tier === 'retail' ? i.margin_retail_pct : i.margin_wholesale_pct.toFixed(2)}%`,
    secondary: `${formatCurrency(i.value_cost)} cost · ${i.stock_quantity} units`,
    share: (Math.abs(i.margin_retail_pct) / max) * 100,
  }));
}

interface OverviewRankingsProps {
  tier: ValuationTier;
  topProfit: InventoryProfitItem[];
  topMargin: InventoryMarginItem[];
  lowMargin: InventoryMarginItem[];
}

export function OverviewRankings({ tier, topProfit, topMargin, lowMargin }: OverviewRankingsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <OverviewCard
        title={`Top Projected Profit · ${TIER_LABEL[tier]}`}
        subtitle="Largest retail profit sitting on the shelf"
      >
        <OverviewRankingList rows={profitRows(topProfit)} emptyMessage="No stocked products with a cost price yet" />
      </OverviewCard>
      <OverviewCard
        title="Highest Margin"
        subtitle="Best retail markup over cost"
      >
        <OverviewRankingList rows={marginRows(topMargin, tier)} emptyMessage="No tradeable products yet" />
      </OverviewCard>
      <OverviewCard
        title="Lowest Margin"
        subtitle="Thinnest retail markup - review pricing"
      >
        <OverviewRankingList rows={marginRows(lowMargin, tier)} emptyMessage="No tradeable products yet" />
      </OverviewCard>
    </div>
  );
}