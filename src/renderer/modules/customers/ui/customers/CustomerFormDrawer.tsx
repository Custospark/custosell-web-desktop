import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateCustomer, useUpdateCustomer } from '../../api/customers/CustomerQueries';
import type { Customer } from '../../api/customers/CustomerTypes';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { PhoneNumberField } from '../../../../shared/components/inputs/PhoneNumberField';
import { User, Mail } from 'lucide-react';
import type { CountryCode } from '../../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../../shared/utils/phoneNumber';
import { displayCustomerPhone } from '../../../../shared/utils/customerContactUtils';

interface CustomerFormDrawerProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

interface FormState {
  name: string;
  localPhone: string;
  email: string;
}

const emptyForm: FormState = { name: '', localPhone: '', email: '' };

export function CustomerFormDrawer({ open, onClose, customer }: CustomerFormDrawerProps) {
  const isEditing = !!customer;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);

  useEffect(() => {
    queueMicrotask(() => {
      if (customer) {
        const displayPhone = displayCustomerPhone(customer.phone);
        const parsed = displayPhone ? parseInternationalPhone(displayPhone) : null;
        setCountryCode(parsed?.countryCode ?? getDefaultCountryCode());
        setForm({
          name: customer.name,
          localPhone: parsed?.localNumber ?? '',
          email: customer.email ?? '',
        });
      } else {
        setCountryCode(getDefaultCountryCode());
        setForm(emptyForm);
      }
    });
  }, [customer, open]);

  const update = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val })), []);

  const fullPhone = buildInternationalPhone(countryCode, form.localPhone) ?? '';

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.localPhone.trim().length > 0, [form]);

  const handleSubmit = () => {
    const payload = { name: form.name.trim(), phone: fullPhone, email: form.email.trim() || null };
    if (isEditing && customer) {
      updateMutation.mutate({ id: customer.id, data: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Customer' : 'Add Customer'}
      subtitle={isEditing ? 'Update customer details' : 'Create a new customer'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Customer Information</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter customer name" required />
            </div>
          </div>
          <PhoneNumberField
            label="Phone"
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            value={form.localPhone}
            onChange={(localPhone) => update('localPhone', localPhone)}
            required
          />
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Optional email address" />
            </div>
          </div>
        </div>
      </div>
    </SlideDrawer>
  );
}

export default CustomerFormDrawer;
