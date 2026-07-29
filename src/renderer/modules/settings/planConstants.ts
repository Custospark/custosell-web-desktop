export const FEATURE_CATALOG: Record<string, { label: string; description: string }> = {
  sales: { label: 'Point of Sale', description: 'Complete point of sale with orders, history & refunds' },
  storefront: { label: 'Online Storefront', description: 'Sell online with your own custom storefront' },
  inventory: { label: 'Inventory & Supply Chain', description: 'Products, stock ledger & supply chain management' },
  accounting: { label: 'Full Accounting', description: 'Chart of accounts, financial reports & reconciliations' },
  hr: { label: 'HR & Payroll', description: 'Employee management, attendance & payroll processing' },
  expenses: { label: 'Expense Tracking', description: 'Record, categorize and analyse expenses' },
  estimates: { label: 'Project Management', description: 'Quotes, projects & reusable templates' },
  pipeline: { label: 'Sales Pipeline (CRM)', description: 'CRM boards, leads & team collaboration' },
  forecasting: { label: 'Financial Forecasting', description: 'Financial projections, budgets & cash flow' },
  documents: { label: 'Document Management', description: 'Secure file storage, sharing & e-signatures' },
  customers: { label: 'Customer Management', description: 'Customer profiles & purchase history' },
  dashboard: { label: 'Dashboard & Analytics', description: 'Real-time business performance metrics' },
  marketplace: { label: 'Supply Marketplace', description: 'Source products from other businesses' },
};

export const LIMIT_LABELS: Record<string, string> = {
  max_staff: 'Staff accounts',
  max_products: 'Products',
  max_businesses: 'Business locations',
};

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
  past_due: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Past Due' },
  suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expired' },
};

import { getBusinessCurrency } from '../../shared/utils/formatCurrency';

export function formatCurrency(amount: number, currency?: string): string {
  const cur = currency || getBusinessCurrency();
  return new Intl.NumberFormat('en-UG', {
    style: 'currency', currency: cur, maximumFractionDigits: 0,
  }).format(amount);
}
