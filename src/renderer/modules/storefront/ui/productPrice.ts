import type { StorefrontProduct } from '../api/storefrontTypes';

export type ProductPriceDisplay = {
  regular: number;
  sale: number;
  percent: number | null;
  onSale: boolean;
};

/** Resolve regular vs sale price for storefront display and cart totals. */
export function resolveProductPrice(
  product: Pick<StorefrontProduct, 'unit_price' | 'sale_price' | 'discount_percent'>,
): ProductPriceDisplay {
  const regular = Number(product.unit_price);
  const percentRaw = product.discount_percent != null ? Number(product.discount_percent) : 0;
  const percent = Number.isFinite(percentRaw) && percentRaw > 0 ? percentRaw : null;

  let sale = product.sale_price != null ? Number(product.sale_price) : regular;
  if (percent != null && (product.sale_price == null || !Number.isFinite(sale))) {
    sale = Math.round(regular * (1 - percent / 100) * 100) / 100;
  }

  const onSale = percent != null && sale < regular;

  return {
    regular: Number.isFinite(regular) ? regular : 0,
    sale: Number.isFinite(sale) ? sale : 0,
    percent: onSale ? percent : null,
    onSale,
  };
}

export function effectiveUnitPrice(
  product: Pick<StorefrontProduct, 'unit_price' | 'sale_price' | 'discount_percent'>,
): number {
  const { sale, onSale, regular } = resolveProductPrice(product);
  return onSale ? sale : regular;
}
