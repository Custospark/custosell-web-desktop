import type { Customer } from '../../modules/customers/api/customers/CustomerTypes';
import type { Invoice } from '../../modules/invoices/api/InvoiceTypes';
import type { Sale } from '../../modules/sales/api/salesTypes';

export interface CustomerContactValue {
  customerId: number | null;
  name: string;
  email: string;
  phone: string;
}

export const EMPTY_CUSTOMER_CONTACT: CustomerContactValue = {
  customerId: null,
  name: '',
  email: '',
  phone: '',
};

export function customerToContact(customer: Customer): CustomerContactValue {
  return {
    customerId: customer.id,
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
  };
}

export function customerContactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export interface CustomerContactMeta {
  selected: Customer | null;
  hasDraftContact: boolean;
  isWalkIn: boolean;
  displayName: string;
  statusLabel: string;
  email: string | null;
  phone: string | null;
}

export function getCustomerContactMeta(
  value: CustomerContactValue,
  customers: Customer[] = [],
): CustomerContactMeta {
  const selected = value.customerId
    ? customers.find((c) => c.id === value.customerId) ?? null
    : null;
  const hasDraftContact = !value.customerId && Boolean(
    value.name.trim() || value.email.trim() || value.phone.trim(),
  );
  const isWalkIn = !value.customerId && !hasDraftContact;

  let statusLabel = 'Tap to add customer';
  if (value.customerId) statusLabel = 'Saved customer';
  else if (hasDraftContact) statusLabel = 'New contact';

  return {
    selected,
    hasDraftContact,
    isWalkIn,
    displayName: selected?.name || value.name.trim() || 'Walk-in customer',
    statusLabel,
    email: selected?.email || value.email.trim() || null,
    phone: selected?.phone || value.phone.trim() || null,
  };
}

export function filterCustomersByQuery(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((c) => {
    const name = c.name?.toLowerCase() ?? '';
    const phone = c.phone ?? '';
    const email = c.email?.toLowerCase() ?? '';
    return name.includes(q) || phone.includes(q) || email.includes(q);
  });
}

export function saleDocumentEmailCount(sale: Sale, linkedInvoice?: Invoice | null): number {
  const paymentEmails = (sale.payments ?? []).reduce(
    (sum, p) => sum + (p.email_sent_count ?? 0),
    0,
  );
  const invoiceEmails = linkedInvoice?.email_sent_count ?? 0;
  return paymentEmails + invoiceEmails;
}

export function latestSyncablePayment(sale: Sale) {
  const payments = [...(sale.payments ?? [])]
    .filter((p) => p.id > 0 && !p._pendingSync)
    .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
  return payments[payments.length - 1] ?? null;
}

export function saleEmailDocumentTarget(sale: Sale, linkedInvoice?: Invoice | null): {
  documentType: 'payment_receipt' | 'invoice';
  documentId: number;
  documentLabel: string;
  emailSentCount: number;
} | null {
  const latestPayment = latestSyncablePayment(sale);
  if (latestPayment) {
    return {
      documentType: 'payment_receipt',
      documentId: latestPayment.id,
      documentLabel: `Receipt ${latestPayment.receipt_number}`,
      emailSentCount: latestPayment.email_sent_count ?? 0,
    };
  }
  if (linkedInvoice && linkedInvoice.id > 0) {
    return {
      documentType: 'invoice',
      documentId: linkedInvoice.id,
      documentLabel: `Invoice ${linkedInvoice.invoice_number}`,
      emailSentCount: linkedInvoice.email_sent_count ?? 0,
    };
  }
  return null;
}
