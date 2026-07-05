import { useMemo, useState } from 'react';
import {
  Search, User, UserPlus, Users, X, Check, Store, Mail, Phone,
} from 'lucide-react';
import { useCustomers } from '../../../modules/customers/api/customers/CustomerQueries';
import { Input } from '../inputs/Input';
import { cn } from '../../utils/cn';
import {
  customerToContact,
  customerContactInitials,
  filterCustomersByQuery,
  type CustomerContactValue,
  EMPTY_CUSTOMER_CONTACT,
} from '../../utils/customerContactUtils';

interface CustomerContactPickerProps {
  value: CustomerContactValue;
  onChange: (value: CustomerContactValue) => void;
  disabled?: boolean;
  className?: string;
  /** When true, uses tighter spacing for POS billing column */
  compact?: boolean;
  showLabel?: boolean;
  /** Hide the summary card (e.g. when shown outside in a compact field) */
  showSummary?: boolean;
  /** checkout = full form; email = name/phone only (recipient email lives in parent) */
  context?: 'checkout' | 'email';
}

type PickerTab = 'existing' | 'new';

function isEmailLike(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export default function CustomerContactPicker({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
  showLabel = true,
  showSummary = true,
  context = 'checkout',
}: CustomerContactPickerProps) {
  const { data: customers = [] } = useCustomers();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<PickerTab>('existing');

  const filtered = useMemo(
    () => filterCustomersByQuery(customers, search),
    [customers, search],
  );

  const selected = value.customerId
    ? customers.find((c) => c.id === value.customerId) ?? null
    : null;

  const hasDraftContact = !value.customerId && Boolean(
    value.name.trim() || value.email.trim() || value.phone.trim(),
  );

  const isWalkIn = !value.customerId && !hasDraftContact;

  function selectCustomer(id: number | null) {
    if (id === null) {
      onChange({ ...EMPTY_CUSTOMER_CONTACT });
      setSearch('');
      setActiveTab('existing');
      return;
    }
    const customer = customers.find((c) => c.id === id);
    if (customer) {
      onChange(customerToContact(customer));
      setSearch('');
      setActiveTab('existing');
    }
  }

  function patchField(field: 'name' | 'email' | 'phone', fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  function clearContact() {
    onChange({ ...EMPTY_CUSTOMER_CONTACT });
    setSearch('');
    setActiveTab('existing');
  }

  function useSearchAsNewContact() {
    const q = search.trim();
    if (!q) {
      setActiveTab('new');
      return;
    }
    if (isEmailLike(q)) {
      onChange({ ...value, customerId: null, email: q });
    } else {
      onChange({ ...value, customerId: null, name: q });
    }
    setSearch('');
    setActiveTab('new');
  }

  const summaryName = selected?.name || value.name.trim() || null;
  const summaryEmail = selected?.email || value.email.trim() || null;
  const summaryPhone = selected?.phone || value.phone.trim() || null;

  return (
    <div className={cn('space-y-3', className)}>
      {showLabel && (
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Customer
        </label>
      )}

      {showSummary && (
      <div
        className={cn(
          'rounded-xl border px-3 py-2.5 flex items-start gap-2.5',
          value.customerId && 'border-emerald-200 bg-emerald-50/70',
          hasDraftContact && 'border-amber-200 bg-amber-50/60',
          isWalkIn && 'border-gray-200 bg-gray-50/80',
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            value.customerId && 'bg-emerald-100 text-emerald-700',
            hasDraftContact && 'bg-amber-100 text-amber-800',
            isWalkIn && 'bg-gray-100 text-gray-500',
          )}
        >
          {value.customerId && summaryName ? (
            customerContactInitials(summaryName)
          ) : hasDraftContact ? (
            <UserPlus className="w-4 h-4" />
          ) : (
            <Store className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {value.customerId && (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">{summaryName}</p>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Saved customer</p>
            </>
          )}
          {hasDraftContact && (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {summaryName || 'New contact'}
              </p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                Will be added to your customer list
              </p>
            </>
          )}
          {isWalkIn && (
            <>
              <p className="text-sm font-semibold text-gray-700">Walk-in customer</p>
              <p className="text-[11px] text-gray-500 mt-0.5">No contact details yet</p>
            </>
          )}

          {(summaryEmail || summaryPhone) && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-gray-600">
              {summaryEmail && (
                <span className="inline-flex items-center gap-1 truncate max-w-full">
                  <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                  {summaryEmail}
                </span>
              )}
              {summaryPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                  {summaryPhone}
                </span>
              )}
            </div>
          )}
        </div>

        {!isWalkIn && !disabled && (
          <button
            type="button"
            title="Clear customer"
            onClick={clearContact}
            className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab('existing')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors',
            activeTab === 'existing'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Existing
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveTab('new')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors',
            activeTab === 'new'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <UserPlus className="w-3.5 h-3.5" />
          New contact
        </button>
      </div>

      {/* Tab panels */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {activeTab === 'existing' ? (
          <div className="p-2.5 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                disabled={disabled}
                className={cn(
                  'w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm',
                  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  disabled && 'opacity-60',
                )}
                placeholder="Search name, phone, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={cn('overflow-y-auto space-y-1', compact ? 'max-h-36' : 'max-h-44')}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => selectCustomer(null)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  isWalkIn ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50',
                  disabled && 'opacity-60',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Store className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800 block">Walk-in customer</span>
                  <span className="text-[11px] text-gray-500">No contact details</span>
                </span>
                {isWalkIn && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              {filtered.map((c) => {
                const isSelected = value.customerId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectCustomer(c.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50',
                      disabled && 'opacity-60',
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      {customerContactInitials(c.name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 block truncate">{c.name}</span>
                      <span className="text-[11px] text-gray-500 block truncate">
                        {[c.phone, c.email].filter(Boolean).join(' · ') || 'No phone or email'}
                      </span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}

              {search.trim() && filtered.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center">
                  <p className="text-xs text-gray-500">No customer matches &ldquo;{search.trim()}&rdquo;</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={useSearchAsNewContact}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60"
                  >
                    Add as new contact
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              {context === 'email'
                ? 'Add the customer name and phone. The recipient email is set in the field below.'
                : 'Enter contact details for a new customer. They\'ll be saved when you complete the sale or send email.'}
            </p>

            <Input
              label="Name"
              value={value.name}
              onChange={(e) => patchField('name', e.target.value)}
              placeholder="e.g. Jane Doe"
              disabled={disabled}
            />

            <div className={compact || context === 'email' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
              {context === 'checkout' && (
                <Input
                  label="Email"
                  type="email"
                  value={value.email}
                  onChange={(e) => patchField('email', e.target.value)}
                  placeholder="email@example.com"
                  disabled={disabled}
                />
              )}
              <Input
                label="Phone"
                type="tel"
                value={value.phone}
                onChange={(e) => patchField('phone', e.target.value)}
                placeholder="Phone number"
                disabled={disabled}
              />
            </div>

            {value.customerId && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                Editing details here won&apos;t change the selected saved customer. Clear the selection first to add someone new.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { EMPTY_CUSTOMER_CONTACT };
