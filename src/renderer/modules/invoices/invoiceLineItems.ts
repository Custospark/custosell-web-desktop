import type { Product } from '../inventory/api/products/ProductTypes';
import type { Invoice, InvoiceItem } from './api/InvoiceTypes';

export interface InvoiceLineItem {
  lineKey: string;
  product_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  discount_amount?: number;
  unit?: string | null;
  tax_percentage?: string | null;
  tax_class?: string | null;
  /** Charged price tier for this line — retained from the sale/cart so invoices show (RP)/(WSP). */
  priceTier?: 'retail' | 'wholesale';
}

export function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function newLineKey(productId?: number | null): string {
  return `new-${productId ?? 'custom'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function lineNetTotal(item: Pick<InvoiceLineItem, 'unit_price' | 'quantity' | 'discount_amount'>): number {
  const qty = Math.max(0, item.quantity);
  const discount = Number(item.discount_amount ?? 0);
  return Math.max(0, item.unit_price * qty - discount);
}

function enrichFromProduct(item: InvoiceItem, products?: Product[]): Pick<InvoiceLineItem, 'unit' | 'tax_percentage' | 'tax_class'> {
  if (!item.product_id || !products?.length) {
    return { unit: null, tax_percentage: null, tax_class: null };
  }
  const product = products.find((p) => p.id === item.product_id);
  if (!product) {
    return { unit: null, tax_percentage: null, tax_class: null };
  }
  return {
    unit: product.unit,
    tax_percentage: product.tax_percentage,
    tax_class: product.tax_class,
  };
}

export function invoiceItemsToLineItems(invoice: Invoice, products?: Product[]): InvoiceLineItem[] {
  return (invoice.items ?? []).map((item) => ({
    lineKey: `existing-${item.id ?? item.product_id ?? item.description}`,
    product_id: item.product_id,
    name: item.description,
    unit_price: Number(item.unit_price),
    quantity: Number(item.quantity),
    discount_amount: Number(item.discount_amount ?? 0),
    priceTier: item.price_tier,
    ...enrichFromProduct(item, products),
  }));
}

export function lineItemsToPayload(items: InvoiceLineItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    description: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: Number(item.discount_amount ?? 0),
    price_tier: item.priceTier ?? 'retail',
    subtotal: lineNetTotal(item),
  }));
}

/** Map sales cart rows into editable invoice line items (stable lineKey per cart row). */
export function cartItemsToLineItems(
  cartItems: {
    product_id: number;
    name: string;
    unit_price: number;
    quantity: number;
    discount_amount?: number;
    price_tier?: 'retail' | 'wholesale';
    unit?: string | null;
    tax_percentage?: number | string | null;
    tax_class?: string | null;
  }[],
): InvoiceLineItem[] {
  return cartItems.map((item) => ({
    lineKey: `cart-${item.product_id}`,
    product_id: item.product_id,
    name: item.name,
    unit_price: item.unit_price,
    quantity: Number(item.quantity),
    discount_amount: Number(item.discount_amount ?? 0),
    unit: item.unit ?? null,
    tax_percentage: item.tax_percentage != null ? String(item.tax_percentage) : null,
    tax_class: item.tax_class ?? null,
    priceTier: item.price_tier,
  }));
}

/** Map completed sale lines into invoice builder rows (net of refunds, keeping real prices + line discounts). */
export function saleItemsToLineItems(
  saleItems: {
    id: number;
    product_id: number | null;
    product_name: string;
    unit_price: string | number;
    quantity: number;
    discount_amount?: string | number;
    refunded_quantity?: number;
    price_tier?: 'retail' | 'wholesale';
    product_price?: string | number | null;
  }[],
): InvoiceLineItem[] {
  return saleItems
    .map((item) => {
      const netQty = item.quantity - (item.refunded_quantity ?? 0);
      const unitPrice = Number(item.unit_price);
      const retailPrice = Number(item.product_price ?? 0);
      const tier = item.price_tier
        ?? (retailPrice > 0 && unitPrice < retailPrice ? 'wholesale' : 'retail');
      return {
        lineKey: `sale-item-${item.id}`,
        product_id: item.product_id,
        name: item.product_name,
        unit_price: unitPrice,
        quantity: netQty,
        discount_amount: Number(item.discount_amount ?? 0),
        unit: null,
        tax_percentage: null,
        tax_class: null,
        priceTier: tier,
      };
    })
    .filter((item) => item.quantity > 0);
}