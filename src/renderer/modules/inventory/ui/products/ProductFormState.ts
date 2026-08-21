import type { CatalogItemType, CreateProductData, Product } from '../../api/products/ProductTypes';
import type { TaxClass } from '../../../../shared/utils/taxEngine';

export interface FormState {
  name: string; type: CatalogItemType; unit: string; pricing_unit: string; category_id: number | null; description: string | null;
  sku: string | null; barcode: string | null; is_active: boolean;
  is_recurring: boolean; billing_interval: string;
  unit_price: string; wholesale_price: string; cost_price: string; stock_quantity: string;
  low_stock_threshold: string; tax_percentage: string; tax_class: TaxClass;
  discount_percent: string; location_id: number | null;
}

export const emptyForm: FormState = {
  name: '', type: 'product', unit: '', pricing_unit: '', category_id: null, description: null,
  sku: null, barcode: null, is_active: true,
  is_recurring: false, billing_interval: 'month',
  unit_price: '', wholesale_price: '', cost_price: '', stock_quantity: '0',
  low_stock_threshold: '5', tax_percentage: '0', tax_class: 'standard',
  discount_percent: '', location_id: null,
};

export function toNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function toProductForm(product: Product): FormState {
  return {
    name: product.name, type: product.type === 'service' ? 'service' : 'product',
    unit: product.unit ?? '', pricing_unit: product.pricing_unit ?? '', category_id: product.category_id, description: product.description,
    sku: product.sku, barcode: product.barcode, is_active: product.is_active,
    is_recurring: product.is_recurring ?? false,
    billing_interval: product.billing_interval ?? 'month',
    unit_price: product.unit_price, wholesale_price: product.wholesale_price ?? '', cost_price: product.cost_price ?? '',
    stock_quantity: String(product.stock_quantity), low_stock_threshold: String(product.low_stock_threshold),
    tax_percentage: product.tax_percentage,
    tax_class: (product.tax_class as TaxClass) || 'standard',
    discount_percent:
      product.discount_percent != null && product.discount_percent !== ''
        ? String(product.discount_percent)
        : '',
    location_id: null,
  };
}

export function toCreatePayload(f: FormState, defaultLocationId: number | null): CreateProductData {
  const isService = f.type === 'service';
  return {
    name: f.name, type: f.type, unit: f.unit || null, pricing_unit: f.pricing_unit || null, category_id: f.category_id, description: f.description,
    sku: f.sku, barcode: f.barcode, is_active: f.is_active,
    is_recurring: f.is_recurring,
    billing_interval: f.is_recurring ? (f.billing_interval || 'month') : null,
    unit_price: toNumber(f.unit_price),
    discount_percent: f.discount_percent === '' ? null : toNumber(f.discount_percent),
    wholesale_price: f.wholesale_price === '' ? null : toNumber(f.wholesale_price),
    cost_price: f.cost_price === '' ? null : toNumber(f.cost_price),
    stock_quantity: isService ? 0 : toNumber(f.stock_quantity),
    low_stock_threshold: isService ? 0 : toNumber(f.low_stock_threshold),
    tax_percentage: toNumber(f.tax_percentage),
    tax_class: f.tax_class,
    location_id: f.location_id ?? defaultLocationId ?? undefined,
  };
}