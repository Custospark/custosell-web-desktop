import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Select } from '../../../shared/components/inputs/Select';
import { Input } from '../../../shared/components/inputs/Input';
import { useCustomers } from '../api/salesQueries';
import { useCreateInvoice } from '../../invoices/api/InvoiceQueries';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useBusinessTaxSettings } from '../../settings/hooks/useBusinessTaxSettings';
import { computeSaleTax } from '../../../shared/utils/taxEngine';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { FileText, Calendar, MessageSquare } from 'lucide-react';

interface InvoiceFromSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceFromSaleModal({ open, onClose, onSuccess }: InvoiceFromSaleModalProps) {
  const navigate = useNavigate();
  const cartItems = useAppSelector((s) => s.sales.cartItems);
  const customerId = useAppSelector((s) => s.sales.customerId);
  const discountAmount = useAppSelector((s) => s.sales.discountAmount);
  const discountType = useAppSelector((s) => s.sales.discountType);
  const { taxSettings } = useBusinessTaxSettings();

  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const { data: customers } = useCustomers();
  const createInvoice = useCreateInvoice();

  useEffect(() => {
    if (!open) return;
    setSelectedCustomerId(customerId ? String(customerId) : '');
    setDueDate(defaultDueDate());
  }, [open, customerId]);

  const subtotal = useMemo(
    () => cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0),
    [cartItems],
  );

  const discountValue = useMemo(() => (
    discountType === 'percentage'
      ? Math.min(subtotal * (discountAmount / 100), subtotal)
      : Math.min(discountAmount, subtotal)
  ), [discountType, discountAmount, subtotal]);

  const taxBreakdown = useMemo(
    () => computeSaleTax(taxSettings, cartItems, discountValue),
    [taxSettings, cartItems, discountValue],
  );

  function handleCreate() {
    if (cartItems.length === 0) return;

    createInvoice.mutate({
      customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      tax_total: taxBreakdown.taxTotal,
      notes: notes || undefined,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      })),
    }, {
      onSuccess: () => {
        onSuccess();
        onClose();
        navigate(ROUTES.INVOICES.INDEX);
      },
    });
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Generate Invoice" size="lg">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0" />
          An invoice will be created with the current cart items. No payment is recorded — the customer pays later.
        </div>

        {cartItems.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            Add items to the cart before generating an invoice.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <Select
              options={[
                { value: '', label: 'Walk-in Customer' },
                ...(customers ?? []).map((c: { id: number; name: string }) => ({ value: String(c.id), label: c.name })),
              ]}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Due Date
            </label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />Notes (optional)
          </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment terms, delivery instructions, etc."
            />
          </div>

        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {cartItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-gray-700 truncate flex-1">{item.name}</span>
              <span className="text-gray-500 mx-3">{item.quantity} × {formatCurrency(item.unit_price)}</span>
              <span className="font-medium tabular-nums">{formatCurrency(item.quantity * item.unit_price)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
          {discountValue > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="tabular-nums text-green-600">-{formatCurrency(discountValue)}</span>
            </div>
          )}
          {taxBreakdown.taxEnabled && taxBreakdown.taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">VAT</span>
              <span className="tabular-nums">{formatCurrency(taxBreakdown.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(taxBreakdown.total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={handleCreate}
            loading={createInvoice.isPending}
            disabled={cartItems.length === 0 || !dueDate}
          >
            <FileText className="w-4 h-4 mr-1.5" />Generate Invoice
          </Button>
        </div>
      </div>
    </Modal>
  );
}
