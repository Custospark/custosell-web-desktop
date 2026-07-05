import { useState } from 'react';
import { useRecordPayment } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import { Button } from '../../shared/components/buttons/Button';
import { X } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank Transfer' },
];

export default function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const recordPayment = useRecordPayment();
  const remainingBalance = invoice.total_amount - (invoice.amount_paid || 0);
  const [amount, setAmount] = useState(remainingBalance);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0 || amount > remainingBalance) return;
    recordPayment.mutate(
      { id: invoice.id, amount, payment_method: paymentMethod },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Invoice:</span>
            <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total:</span>
            <span className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount Paid:</span>
            <span className="font-medium text-gray-900">{formatCurrency(invoice.amount_paid || 0)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
            <span className="text-gray-700 font-medium">Remaining:</span>
            <span className="font-bold text-red-600">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              min={0.01}
              max={remainingBalance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={amount <= 0 || amount > remainingBalance} loading={recordPayment.isPending}>
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
