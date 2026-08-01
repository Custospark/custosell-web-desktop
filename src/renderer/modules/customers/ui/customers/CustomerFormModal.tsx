import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCreateCustomer, useUpdateCustomer } from '../../api/customers/CustomerQueries';
import type { Customer } from '../../api/customers/CustomerTypes';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { PhoneNumberField } from '../../../../shared/components/inputs/PhoneNumberField';
import { Users, User, Mail, Check } from 'lucide-react';
import type { CountryCode } from '../../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../../shared/utils/phoneNumber';
import { displayCustomerPhone } from '../../../../shared/utils/customerContactUtils';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineLabelClass,
} from '../../../pipeline/ui/pipelineFormFields';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  /** Called with the created customer so callers (e.g. an invoice) can auto-select it. */
  onCreated?: (customer: Customer) => void;
}

interface FormState {
  name: string;
  localPhone: string;
  email: string;
}

const emptyForm: FormState = { name: '', localPhone: '', email: '' };

export function CustomerFormModal({ open, onClose, customer, onCreated }: CustomerFormModalProps) {
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

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = { name: form.name.trim(), phone: fullPhone, email: form.email.trim() || null };
    if (isEditing && customer) {
      updateMutation.mutate({ id: customer.id, data: payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          onCreated?.(created);
          onClose();
        },
      });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Customer' : 'Add Customer'}
      subtitle={isEditing ? 'Update customer details' : 'Create a new customer'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PipelineModalHero
          icon={Users}
          tone="blue"
          title={isEditing ? 'Update customer' : 'New customer'}
          description={isEditing ? 'Update customer details' : 'Create a new customer for the ledger'}
        />

        <PipelineFormSection title="Customer information" icon={User}>
          <PipelineIconField label="Name" icon={User} required>
            <input
              className={pipelineInputClass}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Enter customer name"
              required
              autoFocus
            />
          </PipelineIconField>

          <div>
            <label className={pipelineLabelClass}>
              Phone
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <PhoneNumberField
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              value={form.localPhone}
              onChange={(localPhone) => update('localPhone', localPhone)}
              required
            />
          </div>

          <PipelineIconField label="Email" icon={Mail}>
            <input
              className={pipelineInputClass}
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="Optional email address"
            />
          </PipelineIconField>
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            <Check className="h-4 w-4" />
            {isEditing ? 'Save customer' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CustomerFormModal;
