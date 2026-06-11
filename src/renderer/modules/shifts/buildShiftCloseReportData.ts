import type { AuthUser, BusinessInfo } from '../../app/store/slices/authSlice';
import { cashHandover, netSales } from '../../shared/utils/accounting';
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';
import {
  grossSaleAmount,
  netSaleAmount,
  netSaleTaxAmount,
  refundedAmount,
  saleTaxRefundedAmount,
} from '../sales/utils/saleAmounts';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
import type { ShiftCloseReportData } from './shiftCloseReportTypes';

function formatDuration(clockIn: string, clockOut: string): string | null {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  const minutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function businessLocation(business: BusinessInfo | null | undefined): string | null {
  if (!business) return null;
  return [business.address, business.city, business.state, business.country].filter(Boolean).join(', ') || null;
}

export function buildShiftCloseReportData(params: {
  business: BusinessInfo | null | undefined;
  authUser: AuthUser | null | undefined;
  clockIn: string | null | undefined;
  clockOut?: string | null;
  shiftSales: SaleWithSyncMeta[];
  shiftExpenses: ExpenseWithSyncMeta[];
  isOfflineCopy?: boolean;
  taxEnabled?: boolean;
}): ShiftCloseReportData {
  const {
    business,
    authUser,
    clockIn,
    clockOut = null,
    shiftSales,
    shiftExpenses,
    isOfflineCopy = false,
    taxEnabled = false,
  } = params;

  const grossSales = shiftSales.reduce((sum, sale) => sum + grossSaleAmount(sale), 0);
  const refunds = shiftSales.reduce((sum, sale) => sum + refundedAmount(sale), 0);
  const outputVat = shiftSales.reduce((sum, sale) => sum + netSaleTaxAmount(sale), 0);
  const vatRefunded = shiftSales.reduce((sum, sale) => sum + saleTaxRefundedAmount(sale), 0);
  const shiftExpenseTotal = shiftExpenses.reduce(
    (sum, expense) => sum + Number.parseFloat(String(expense.amount)) || 0,
    0,
  );
  const netSalesTotal = netSales(grossSales, refunds, shiftExpenseTotal);

  const cash = shiftSales
    .filter((s) => s.payment_method === 'cash')
    .reduce((sum, sale) => sum + netSaleAmount(sale), 0);
  const mobileMoney = shiftSales
    .filter((s) => s.payment_method === 'mobile_money')
    .reduce((sum, sale) => sum + netSaleAmount(sale), 0);
  const cardOther = shiftSales
    .filter((s) => s.payment_method === 'card' || s.payment_method === 'other')
    .reduce((sum, sale) => sum + netSaleAmount(sale), 0);

  const resolvedClockIn = clockIn ?? new Date().toISOString();

  return {
    businessName: business?.name || authUser?.business_name || 'CUSTOSELL',
    businessAddress: businessLocation(business),
    businessPhone: business?.phone ?? null,
    businessEmail: business?.email ?? null,
    currency: business?.currency || 'UGX',
    cashierName: authUser?.name || '—',
    clockIn: resolvedClockIn,
    clockOut,
    duration: clockOut ? formatDuration(resolvedClockIn, clockOut) : null,
    isOfflineCopy,
    transactionCount: shiftSales.length,
    grossSales,
    refunds,
    netSales: netSalesTotal,
    cash,
    mobileMoney,
    cardOther,
    shiftExpenses: shiftExpenseTotal,
    cashHandover: cashHandover(cash, shiftExpenseTotal),
    generatedAt: new Date().toISOString(),
    taxEnabled,
    outputVat,
    vatRefunded,
  };
}
