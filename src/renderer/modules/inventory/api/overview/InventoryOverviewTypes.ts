/** Valuation tier used to present projected profit on the overview page. */
export type ValuationTier = 'retail' | 'wholesale';

export type InventoryOverviewSummary = {
  product_count: number;
  stocked_product_count: number;
  stock_quantity: number;
  value_cost: number;
  value_retail: number;
  value_wholesale: number;
  profit_retail: number;
  profit_retail_pct: number | null;
  profit_wholesale: number;
  profit_wholesale_pct: number | null;
  low_stock_count: number;
  out_of_stock_count: number;
  dead_stock_count: number;
  zero_cost_sku_count: number;
};

export type InventoryCategoryBreakdown = {
  category_id: number | null;
  category_name: string;
  product_count: number;
  stock_quantity: number;
  value_cost: number;
  value_retail: number;
  value_wholesale: number;
};

export type InventoryBranchBreakdown = {
  location_id: number;
  location_name: string;
  product_count: number;
  stock_quantity: number;
  value_cost: number;
  value_retail: number;
  value_wholesale: number;
  share_pct: number | null;
};

export type InventoryMarginItem = {
  product_id: number;
  name: string;
  sku: string | null;
  category_name: string;
  stock_quantity: number;
  value_cost: number;
  value_retail: number;
  value_wholesale: number;
  margin_retail_pct: number;
  margin_wholesale_pct: number;
};

export type InventoryProfitItem = {
  product_id: number;
  name: string;
  sku: string | null;
  stock_quantity: number;
  value_cost: number;
  value_retail: number;
  value_wholesale: number;
  profit_retail: number;
};

export type InventoryDeadStockItem = {
  product_id: number;
  name: string;
  sku: string | null;
  stock_quantity: number;
  value_cost: number;
  cost_price: number;
  last_activity: string | null;
  dead_days: number | null;
};

export type InventoryStatusItem = {
  product_id: number;
  name: string;
  sku: string | null;
  category_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  value_cost: number;
};

export type InventoryTrendPoint = {
  month: string;
  label: string;
  value_cost: number;
  stock_quantity: number;
};

export type InventoryOverviewData = {
  as_of: string;
  location_id: number | null;
  location_name: string;
  summary: InventoryOverviewSummary;
  by_category: InventoryCategoryBreakdown[];
  by_branch: InventoryBranchBreakdown[];
  top_margin: InventoryMarginItem[];
  low_margin: InventoryMarginItem[];
  top_profit: InventoryProfitItem[];
  dead_stock: InventoryDeadStockItem[];
  low_stock: InventoryStatusItem[];
  out_of_stock: InventoryStatusItem[];
  trend: InventoryTrendPoint[];
};