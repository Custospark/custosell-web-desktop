import { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
import { PipelineFormSection } from '../ui/estimatesShared';
import EstimateMarginSummary from '../ui/EstimateMarginSummary';
import { FileSpreadsheet, ReceiptText, ScrollText, Notebook, Percent } from 'lucide-react';

export interface EstimateBuilderHandle {
  submit: () => Promise<void>;
}

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
  embedded?: boolean;
}

const EstimateBuilderForm = forwardRef<EstimateBuilderHandle, EstimateBuilderFormProps>(function EstimateBuilderForm({
  mode,
  estimate,
  seed,
  onComplete,
  embedded = false,
}, ref) {
  const { data: business } = useBusiness();
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const resolveCustomer = useResolveCustomerContact();

  const currency = business?.currency ?? 'UGX';
  const isEdit = mode === 'edit';

  const initMarkup = () => {
    if (estimate?.line_items?.length) {
      const itemMarkups = estimate.line_items.filter((li) => li.markup_type === 'percent' && li.markup_value > 0);
      if (itemMarkups.length > 0) {
        const avg = itemMarkups.reduce((s, li) => s + li.markup_value, 0) / itemMarkups.length;
        return Math.round(avg);
      }
    }
    return 20;
  };

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
    return [newEditableLineItem(20)];
  });
  const [defaultMarkup, setDefaultMarkup] = useState(initMarkup);
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

  const handleSubmit = useCallback(async () => {
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
  }, [title, lineItems, contact, resolveCustomer, seed, estimate, isEdit, taxRate, validUntil, notes, terms, internalNotes, createEstimate, updateEstimate, onComplete]);

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

  const content = (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? `Edit ${estimate?.estimate_number ?? 'estimate'}` : 'New estimate'}
          </h2>
        </div>
      )}

      <PipelineFormSection title="Proposal details" icon={FileSpreadsheet}>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Office renovation proposal" />
        <CustomerContactField value={contact} onChange={setContact} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Valid until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tax rate (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={taxRate === 0 ? '' : String(taxRate)}
              placeholder="0"
              onChange={(e) => {
                const raw = e.target.value;
                setTaxRate(raw === '' ? 0 : parseFloat(raw) || 0);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Percent className="h-3.5 w-3.5 text-gray-400" />
              Default markup
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={defaultMarkup === 0 ? '' : String(defaultMarkup)}
                placeholder="20"
                onChange={(e) => {
                  const raw = e.target.value;
                  setDefaultMarkup(raw === '' ? 0 : parseInt(raw, 10) || 0);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
              <span className="text-sm text-gray-400 shrink-0">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Applied to new items. Set per-item below.</p>
          </div>
        </div>
      </PipelineFormSection>

      <PipelineFormSection title="Line items" icon={ReceiptText}>
        <EstimateLineItemEditor
          items={lineItems}
          onChange={setLineItems}
          currency={currency}
          defaultMarkup={defaultMarkup}
        />
        <div className="mt-2">
          <EstimateMarginSummary
            lineItems={editableEstimateItems as Estimate['line_items']}
            currency={currency}
            taxRate={taxRate}
          />
        </div>
      </PipelineFormSection>

      <PipelineFormSection title="Notes & terms" icon={ScrollText}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Customer notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes visible to the customer on the proposal..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Terms & conditions</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            placeholder="Payment terms, delivery conditions, etc."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Notebook className="h-3.5 w-3.5 text-gray-400" />
            Internal notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            placeholder="Not visible to the customer..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
          />
        </div>
      </PipelineFormSection>
    </div>
  );

  return content;
});

export default EstimateBuilderForm;