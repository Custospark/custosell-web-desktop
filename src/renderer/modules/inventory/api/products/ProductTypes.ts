export interface Category {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CatalogItemType = 'product' | 'service';

export interface Product {
  id: number;
  business_id: number;
  category_id: number | null;
  category?: Category | null;
  name: string;
  type?: CatalogItemType;
  unit: string | null;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: string;
  wholesale_price: string | null;
  cost_price: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  tax_percentage: string;
  tax_class?: 'standard' | 'exempt' | 'zero_rated' | string;
  is_active: boolean;
  is_recurring?: boolean;
  billing_interval?: string | null;
  listed_for_supply?: boolean;
  supply_price?: string | number | null;
  supply_min_qty?: number | null;
  listed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Physical products track inventory; services do not. */
export function tracksStock(p: { type?: CatalogItemType | string | null }): boolean {
  return (p.type ?? 'product') !== 'service';
}

export function isServiceItem(p: { type?: CatalogItemType | string | null }): boolean {
  return (p.type ?? 'product') === 'service';
}

export function isSellable(p: Product): boolean {
  return p.is_active && (tracksStock(p) ? p.stock_quantity > 0 : true);
}

export const SERVICE_QTY_SOFT_CAP = 9999;

export interface StockMovementUser {
  id: number;
  name: string;
  email?: string | null;
  avatar?: string | null;
}

export interface StockMovement {
  id: number;
  business_id: number;
  product_id: number;
  product?: { id: number; name: string } | null;
  sale_item_id: number | null;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial';
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference: string | null;
  notes: string | null;
  created_by: number | null;
  /** Nested user who recorded the movement (avatar + name). */
  created_by_user?: StockMovementUser | { data: StockMovementUser } | null;
  created_at: string;
  updated_at: string;
}

export function stockMovementActor(m: StockMovement): StockMovementUser | null {
  const raw = m.created_by_user;
  if (!raw) return null;
  if ('data' in raw && raw.data) return raw.data;
  if ('name' in raw && raw.name) return raw as StockMovementUser;
  return null;
}

export interface CreateProductData {
  name: string;
  type?: CatalogItemType;
  unit?: string | null;
  unit_price: number;
  wholesale_price?: number | null;
  category_id?: number | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  cost_price?: number | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  tax_percentage?: number;
  tax_class?: 'standard' | 'exempt' | 'zero_rated';
  is_active?: boolean;
  is_recurring?: boolean;
  billing_interval?: string | null;
}

export type UpdateProductData = Partial<CreateProductData>;

export interface CreateCategoryData {
  name: string;
  description?: string | null;
  sort_order?: number;
}

export interface CreateStockMovementData {
  product_id: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial';
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference?: string | null;
  notes?: string | null;
}
