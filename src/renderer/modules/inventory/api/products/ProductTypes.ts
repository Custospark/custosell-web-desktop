export interface Category {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  business_id: number;
  category_id: number | null;
  category?: Category | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: string;
  cost_price: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  tax_percentage: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  unit_price: number;
  category_id?: number | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  cost_price?: number | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  tax_percentage?: number;
  is_active?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

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
