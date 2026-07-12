/* eslint-disable react-refresh/only-export-components -- shared invoice list helpers + one icon button */
import type { ReactNode } from 'react';
import { cn } from '../../shared/utils/cn';
import type { Invoice } from './api/InvoiceTypes';

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  paid: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  partially_paid: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  overdue: 'bg-red-100 text-red-800 ring-1 ring-red-300 font-semibold',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

export function balanceDue(inv: Invoice): number {
  return Math.max(0, inv.total_amount - (inv.amount_paid || 0));
}

export function isOverdue(inv: Invoice): boolean {
  if (inv.status === 'paid' || inv.status === 'cancelled') return false;
  if (balanceDue(inv) <= 0) return false;
  const due = new Date(inv.due_date);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export function displayStatus(inv: Invoice): string {
  if (isOverdue(inv) && inv.status !== 'overdue') return 'overdue';
  return inv.status;
}

/** Received = PO invoice from a supplier (buyer view). */
export function isReceivedInvoice(inv: Invoice): boolean {
  return inv.direction === 'received';
}

/**
 * Counterparty for list/modal headers.
 * `asBuyer` — Discover B2C / supplier view: always the issuing shop, never the customer row.
 */
export function invoicePartyLabel(
  inv: Invoice,
  opts?: { asBuyer?: boolean },
): string {
  if (opts?.asBuyer || isReceivedInvoice(inv)) {
    // Prefer seller snapshot; party_name is already seller when direction=received.
    return inv.seller_business?.name
      ?? inv.party_name
      ?? 'Shop';
  }
  return inv.party_name ?? inv.customer?.name ?? 'Walk-in';
}

export function invoicePartyColumnHeader(isSupplierMode: boolean): string {
  return isSupplierMode ? 'Supplier' : 'Customer';
}

export function InvoiceIconAction({
  title,
  onClick,
  loading,
  disabled,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors',
        'hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : children}
    </button>
  );
}
