import type { Product } from '../inventory/api/products/ProductTypes';
import type { Invoice, InvoiceItem } from './api/InvoiceTypes';

export interface InvoiceLineItem {
  lineKey: string;
  product_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  unit?: string | null;
  tax_percentage?: string | null;
  tax_class?: string | null;
}

export function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function newLineKey(productId?: number | null): string {
  return `new-${productId ?? 'custom'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    ...enrichFromProduct(item, products),
  }));
}

export function lineItemsToPayload(items: InvoiceLineItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    description: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price,
  }));
}

/** Map sales cart rows into editable invoice line items (stable lineKey per cart row). */
export function cartItemsToLineItems(
  cartItems: {
    product_id: number;
    name: string;
    unit_price: number;
    quantity: number;
    unit?: string | null;
    tax_percentage?: number | string | null;
    tax_class?: string | null;
  }[],
): InvoiceLineItem[] {
  return cartItems.map((item) => ({
    lineKey: `cart-${item.product_id}`,
    product_id: item.product_id,
    name: item.name,
    unit_price: Number(item.unit_price),
    quantity: Number(item.quantity),
    unit: item.unit ?? null,
    tax_percentage: item.tax_percentage != null ? String(item.tax_percentage) : null,
    tax_class: item.tax_class ?? null,
  }));
}
