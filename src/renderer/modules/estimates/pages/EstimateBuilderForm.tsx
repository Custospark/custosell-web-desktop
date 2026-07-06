import { useState, useMemo, useEffect } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Input } from '../../../shared/components/inputs/Input';
import CustomerContactField, { EMPTY_CUSTOMER_CONTACT } from '../../../shared/components/customers/CustomerContactField';
import { contactFromValue, useResolveCustomerContact } from '../../../shared/hooks/useResolveCustomerContact';
import { customerToContact, type CustomerContactValue } from '../../../shared/utils/customerContactUtils';
import type { Customer } from '../../customers/api/customers/CustomerTypes';
import { useBusiness } from '../../settings/api/settings/BusinessQueries';
import {
  useCreateEstimate,
  useUpdateEstimate,
} from '../api/useEstimateQueries';
import type { Estimate } from '../api/estimateTypes';
import EstimateLineItemEditor, {
  editableToPayload,
  estimateToEditableItems,
  newEditableLineItem,
  type EditableLineItem,
} from '../ui/EstimateLineItemEditor';
import EstimateMarginSummary from '../ui/EstimateMarginSummary';
import { Save, X } from 'lucide-react';

interface EstimateBuilderFormProps {
  mode: 'create' | 'edit';
  estimate?: Estimate;
  seed?: {
    title?: string;
    customerId?: number | null;
    pipelineLeadId?: number | null;
    lineItems?: EditableLineItem[];
  };
  onComplete: (estimate?: Estimate) => void;
  onCancel?: () => void;
}

export default function EstimateBuilderForm({
  mode,
  estimate,
  seed,
  onComplete,
  onCancel,
}: EstimateBuilderFormProps) {
  const { data: business } = useBusiness();
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const resolveCustomer = useResolveCustomerContact();

  const currency = business?.currency ?? 'UGX';
  const isEdit = mode === 'edit';
  const isPending = createEstimate.isPending || updateEstimate.isPending;

  const [title, setTitle] = useState(seed?.title ?? estimate?.title ?? '');
  const [contact, setContact] = useState<CustomerContactValue>(() => {
    if (seed?.customerId) return { customerId: seed.customerId, name: '', email: '', phone: '' };
    if (estimate?.customer) return customerToContact(estimate.customer as Customer);
    if (estimate?.customer_id) return { customerId: estimate.customer_id, name: '', email: '', phone: '' };
    return EMPTY_CUSTOMER_CONTACT;
  });
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    if (seed?.lineItems?.length) return seed.lineItems;
    if (estimate?.line_items?.length) return estimateToEditableItems(estimate.line_items);
    return [newEditableLineItem()];
  });
  const [taxRate, setTaxRate] = useState(estimate?.tax_rate ?? 0);
  const [validUntil, setValidUntil] = useState(estimate?.valid_until?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(estimate?.notes ?? '');
  const [terms, setTerms] = useState(estimate?.terms ?? '');
  const [internalNotes, setInternalNotes] = useState(estimate?.internal_notes ?? '');

  useEffect(() => {
    if (!isEdit || !estimate) return;
    setTitle(estimate.title);
    setTaxRate(estimate.tax_rate);
    setValidUntil(estimate.valid_until?.slice(0, 10) ?? '');
    setNotes(estimate.notes ?? '');
    setTerms(estimate.terms ?? '');
    setInternalNotes(estimate.internal_notes ?? '');
    if (estimate.line_items?.length) setLineItems(estimateToEditableItems(estimate.line_items));
    if (estimate.customer) setContact(customerToContact(estimate.customer as Customer));
  }, [isEdit, estimate]);

  const editableEstimateItems = useMemo(
    () => lineItems.map((item) => ({
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      unit_price: item.unit_price,
      markup_type: item.markup_type,
      markup_value: item.markup_value,
      is_billable: item.is_billable,
    })),
    [lineItems],
  );

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const payloadLineItems = editableToPayload(lineItems);
    if (payloadLineItems.length === 0) return;

    let customerId = contact.customerId;
    if (!customerId) {
      const hasDraft = contact.name.trim() || contact.email.trim() || contact.phone.trim();
      if (hasDraft) {
        try {
          const customer = await resolveCustomer.mutateAsync(contactFromValue(contact));
          setContact(customerToContact(customer));
          customerId = customer.id;
        } catch {
          /* proceed without customer */
        }
      }
    }

    const payload = {
      title: title.trim(),
      customer_id: customerId ?? null,
      pipeline_lead_id: seed?.pipelineLeadId ?? estimate?.pipeline_lead_id ?? null,
      tax_rate: taxRate,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms || null,
      internal_notes: internalNotes || null,
      line_items: payloadLineItems,
    };

    if (isEdit && estimate) {
      const updated = await updateEstimate.mutateAsync({ id: estimate.id, payload });
      onComplete(updated);
    } else {
      const created = await createEstimate.mutateAsync(payload);
      onComplete(created);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? `Edit ${estimate?.estimate_number ?? 'estimate'}` : 'New estimate'}
        </h2>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} className="inline-flex items-center gap-1.5">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isPending}
            className="inline-flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            {isEdit ? 'Save changes' : 'Save draft'}
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <CustomerContactField value={contact} onChange={setContact} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Valid until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
          <Input
            label="Tax rate (%)"
            type="number"
            min="0"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Line items</h3>
        <EstimateLineItemEditor
          items={lineItems}
          onChange={setLineItems}
          currency={currency}
        />
        <div className="mt-4">
          <EstimateMarginSummary
            lineItems={editableEstimateItems as Estimate['line_items']}
            currency={currency}
            taxRate={taxRate}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Customer notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Terms & conditions</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Internal notes</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </Card>
    </div>
  );
}
