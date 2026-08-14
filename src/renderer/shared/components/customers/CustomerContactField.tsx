import { useState } from 'react';
import { ChevronRight, Mail, Phone, Store, UserPlus } from 'lucide-react';
import { useCustomers } from '../../../modules/customers/api/customers/CustomerQueries';
import { Modal } from '../modals/Modal';
import { Button } from '../buttons/Button';
import CustomerContactPicker from './CustomerContactPicker';
import { cn } from '../../utils/cn';
import {
  customerContactInitials,
  getCustomerContactMeta,
  type CustomerContactValue,
  EMPTY_CUSTOMER_CONTACT,
} from '../../utils/customerContactUtils';

interface CustomerContactFieldProps {
  value: CustomerContactValue;
  onChange: (value: CustomerContactValue) => void;
  disabled?: boolean;
  className?: string;
  context?: 'checkout' | 'email';
  /** Where the field is shown - adjusts modal helper copy */
  surface?: 'sale' | 'invoice';
}

export default function CustomerContactField({
  value,
  onChange,
  disabled = false,
  className,
  context = 'checkout',
  surface = 'sale',
}: CustomerContactFieldProps) {
  const { data: customers = [] } = useCustomers();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerContactValue>(value);

  const meta = getCustomerContactMeta(value, customers);

  function openModal() {
    if (disabled) return;
    setDraft(value);
    setOpen(true);
  }

  function handleDone() {
    onChange(draft);
    setOpen(false);
  }

  function handleClear() {
    setDraft(EMPTY_CUSTOMER_CONTACT);
  }

  const actionLabel = meta.isWalkIn ? 'Add customer' : 'Change';
  const modalHint = surface === 'invoice'
    ? 'Search an existing customer or enter new contact details. Your invoice items and totals stay on this page.'
    : 'Search an existing customer or enter new contact details. Payment fields stay on the sale screen.';

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Customer
        </label>

        <button
          type="button"
          disabled={disabled}
          onClick={openModal}
          className={cn(
            'group w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            disabled && 'opacity-60 cursor-not-allowed',
            !disabled && 'hover:border-blue-300 hover:shadow-sm',
            meta.isWalkIn && 'border-gray-200 bg-gray-50/80',
            meta.hasDraftContact && 'border-amber-200 bg-amber-50/50',
            value.customerId && 'border-emerald-200 bg-emerald-50/60',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              value.customerId && 'bg-emerald-100 text-emerald-700',
              meta.hasDraftContact && 'bg-amber-100 text-amber-800',
              meta.isWalkIn && 'bg-gray-100 text-gray-500',
            )}
          >
            {value.customerId ? (
              customerContactInitials(meta.displayName)
            ) : meta.hasDraftContact ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <Store className="w-4 h-4" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {meta.displayName}
              </span>
              <span
                className={cn(
                  'shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                  meta.isWalkIn && 'text-gray-500 bg-gray-100',
                  meta.hasDraftContact && 'text-amber-700 bg-amber-100',
                  value.customerId && 'text-emerald-700 bg-emerald-100',
                )}
              >
                {meta.statusLabel}
              </span>
            </span>

            {(meta.email || meta.phone) ? (
              <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                {meta.email && (
                  <span className="inline-flex items-center gap-1 truncate max-w-full">
                    <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                    {meta.email}
                  </span>
                )}
                {meta.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                    {meta.phone}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {meta.isWalkIn ? 'Optional - add for receipts & invoices' : meta.statusLabel}
              </span>
            )}
          </span>

          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Customer"
        size="md"
        bodyClassName="px-5 py-4"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {modalHint}
          </p>

          <CustomerContactPicker
            value={draft}
            onChange={setDraft}
            showLabel={false}
            showSummary={false}
            context={context}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!draft.customerId && !draft.name && !draft.email && !draft.phone}
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export { EMPTY_CUSTOMER_CONTACT };
