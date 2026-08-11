export interface ShiftCloseReportData {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  currency: string;
  branchName?: string | null;
  cashierName: string;
  clockIn: string;
  clockOut: string | null;
  duration: string | null;
  isOfflineCopy: boolean;
  transactionCount: number;
  grossSales: number;
  refunds: number;
  netSales: number;
  cash: number;
  mobileMoney: number;
  cardOther: number;
  shiftExpenses: number;
  cashHandover: number;
  openingBalance: number;
  expectedCash?: number;
  countedCash?: number | null;
  variance?: number | null;
  generatedAt: string;
  /** When true, output VAT lines are shown (separate from net sales). */
  taxEnabled?: boolean;
  outputVat?: number;
  vatRefunded?: number;
}

/** Matches Custosell app primary / business-summary report accent */
export const SHIFT_REPORT_ACCENT = '#1e40af';

export const SHIFT_NET_SALES_FORMULA = 'Net sales = gross sales - refunds - shift expenses';
