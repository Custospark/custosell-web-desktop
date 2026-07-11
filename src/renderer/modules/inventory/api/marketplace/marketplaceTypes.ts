export interface MarketplaceBusiness {
  id: number;
  name: string;
  supply_headline: string | null;
  description?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  address?: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_open_for_supply?: boolean;
  is_saved?: boolean;
  listed_products_count?: number;
}

export interface MarketplaceProduct {
  id: number;
  business_id: number;
  name: string;
  sku: string | null;
  unit: string | null;
  description: string | null;
  unit_price: string | number;
  wholesale_price: string | number | null;
  supply_price: string | number | null;
  supply_min_qty: number | null;
  stock_quantity: number;
  is_active: boolean;
  listed_for_supply?: boolean;
}

export function effectiveSupplyPrice(product: MarketplaceProduct): number {
  const supply = product.supply_price != null && product.supply_price !== ''
    ? Number(product.supply_price)
    : NaN;
  if (!Number.isNaN(supply) && supply >= 0) return supply;
  const wholesale = product.wholesale_price != null && product.wholesale_price !== ''
    ? Number(product.wholesale_price)
    : NaN;
  if (!Number.isNaN(wholesale) && wholesale >= 0) return wholesale;
  return Number(product.unit_price) || 0;
}

export interface MarketplaceCartLine {
  product: MarketplaceProduct;
  quantity: number;
}
