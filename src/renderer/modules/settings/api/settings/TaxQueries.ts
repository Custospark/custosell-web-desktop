import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import {
  isValidDateRange,
  resolveReportDateRange,
  type ReportDatePreset,
} from '../../../../shared/utils/reportDatePresets';

export interface VatInputExpenseRow {
  date: string | null;
  category: string;
  description: string;
  supplier_tin: string | null;
  supplier_invoice_no: string | null;
  amount: number;
  vat_amount: number;
}

export interface VatSummary {
  date_from: string;
  date_to: string;
  currency: string;
  jurisdiction: string | null;
  tax_regime: string | null;
  tax_id: string | null;
  output_vat: number;
  output_vat_refunded: number;
  net_output_vat: number;
  input_vat: number;
  vat_payable: number;
  taxable_sales_net: number;
  exempt_sales_net: number;
  zero_rated_sales_net: number;
  claimable_expense_total: number;
  transaction_count: number;
  filing_hint?: string;
  jurisdiction_label?: string;
  input_vat_expenses: VatInputExpenseRow[];
}

export const taxKeys = {
  all: ['tax'] as const,
  vatSummary: (dateFrom: string, dateTo: string) => [...taxKeys.all, 'vat-summary', dateFrom, dateTo] as const,
};

function extractVatSummary(responseData: unknown): VatSummary | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: VatSummary };
  if (wrapped.data && typeof wrapped.data === 'object' && 'net_output_vat' in wrapped.data) {
    return wrapped.data;
  }
  const direct = responseData as VatSummary;
  if ('net_output_vat' in direct) return direct;
  return null;
}

export function useVatSummary(
  preset: ReportDatePreset,
  customFrom = '',
  customTo = '',
  enabled = true,
) {
  const { dateFrom, dateTo } = resolveReportDateRange(preset, customFrom, customTo);
  const rangeValid = isValidDateRange(dateFrom, dateTo);

  return useQuery<VatSummary>({
    queryKey: taxKeys.vatSummary(dateFrom, dateTo),
    enabled: enabled && rangeValid,
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        format: 'json',
      });
      const { data } = await axiosInstance.get<{ data: VatSummary }>(`/reports/vat-summary?${params}`, {
        timeout: 15000,
      });
      const summary = extractVatSummary(data);
      if (!summary) {
        throw new Error('Invalid VAT summary response from server');
      }
      return summary;
    },
    staleTime: 60_000,
  });
}
