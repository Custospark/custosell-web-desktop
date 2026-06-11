export type TaxClass = 'standard' | 'exempt' | 'zero_rated';
export type TaxRegime = 'none' | 'vat_registered';

export interface TaxBusinessSettings {
  tax_regime?: TaxRegime | string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
}

export interface CartTaxLine {
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_percentage?: number | string | null;
  tax_class?: TaxClass | string | null;
}

export interface SaleTaxResult {
  grossBeforeDiscount: number;
  subtotalNet: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  taxEnabled: boolean;
  lineTaxAmounts: number[];
}

export function isTaxEnabled(business: TaxBusinessSettings | null | undefined): boolean {
  return business?.tax_regime === 'vat_registered';
}

function resolveRate(business: TaxBusinessSettings, line: CartTaxLine): number {
  if (!isTaxEnabled(business)) return 0;
  const taxClass = line.tax_class ?? 'standard';
  if (taxClass === 'exempt' || taxClass === 'zero_rated') return 0;

  const productRate = parseFloat(String(line.tax_percentage ?? 0));
  if (productRate > 0) return productRate;

  return parseFloat(String(business.default_vat_rate ?? 18)) || 0;
}

function computeLine(
  business: TaxBusinessSettings,
  line: CartTaxLine,
): { net: number; tax: number; gross: number } {
  const rate = resolveRate(business, line);
  const lineDiscount = line.discount_amount ?? 0;
  const taxableBase = Math.max(0, line.quantity * line.unit_price - lineDiscount);

  if (rate <= 0) {
    const rounded = round2(taxableBase);
    return { net: rounded, tax: 0, gross: rounded };
  }

  if (business.prices_include_tax !== false) {
    const tax = round2(taxableBase * rate / (100 + rate));
    const net = round2(taxableBase - tax);
    return { net, tax, gross: round2(taxableBase) };
  }

  const net = round2(taxableBase);
  const tax = round2(net * rate / 100);
  return { net, tax, gross: round2(net + tax) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mirror backend TaxEngine::computeSale for POS preview and offline sales. */
export function computeSaleTax(
  business: TaxBusinessSettings | null | undefined,
  lines: CartTaxLine[],
  saleDiscount = 0,
): SaleTaxResult {
  const settings: TaxBusinessSettings = business ?? { tax_regime: 'none' };
  const taxEnabled = isTaxEnabled(settings);

  if (!taxEnabled) {
    const grossBeforeDiscount = round2(lines.reduce(
      (sum, line) => sum + line.quantity * line.unit_price - (line.discount_amount ?? 0),
      0,
    ));
    const discountAmount = round2(Math.min(saleDiscount, grossBeforeDiscount));
    const total = round2(Math.max(0, grossBeforeDiscount - discountAmount));

    return {
      grossBeforeDiscount,
      subtotalNet: total,
      taxTotal: 0,
      discountAmount,
      total,
      taxEnabled: false,
      lineTaxAmounts: lines.map(() => 0),
    };
  }

  const computedLines = lines.map((line) => computeLine(settings, line));
  let sumNet = computedLines.reduce((s, l) => s + l.net, 0);
  let sumTax = computedLines.reduce((s, l) => s + l.tax, 0);
  let sumGross = computedLines.reduce((s, l) => s + l.gross, 0);
  let lineTaxAmounts = computedLines.map((l) => l.tax);

  const discountAmount = round2(Math.max(0, saleDiscount));
  if (discountAmount > 0 && sumGross > 0) {
    const ratio = Math.min(1, discountAmount / sumGross);
    sumNet = round2(sumNet * (1 - ratio));
    sumTax = round2(sumTax * (1 - ratio));
    lineTaxAmounts = computedLines.map((l) => round2(l.tax * (1 - ratio)));
    sumGross = round2(sumGross - discountAmount);
  }

  return {
    grossBeforeDiscount: round2(computedLines.reduce((s, l) => s + l.gross, 0)),
    subtotalNet: sumNet,
    taxTotal: round2(Math.max(0, sumTax)),
    discountAmount,
    total: round2(Math.max(0, sumNet + sumTax)),
    taxEnabled: true,
    lineTaxAmounts,
  };
}

export const TAX_CLASS_LABELS: Record<TaxClass, string> = {
  standard: 'Standard (VAT)',
  exempt: 'Exempt',
  zero_rated: 'Zero-rated',
};

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  none: 'Not VAT registered',
  vat_registered: 'VAT registered',
};

/** Mirror backend TaxEngine::computeLineTaxRefund for offline refunds. */
export function computeLineTaxRefund(
  lineTaxAmount: number,
  lineQuantity: number,
  refundQuantity: number,
): number {
  if (lineQuantity <= 0 || refundQuantity <= 0 || lineTaxAmount <= 0) return 0;
  return Math.round(lineTaxAmount * (refundQuantity / lineQuantity) * 100) / 100;
}
