import { useState } from 'react';
import { useRecordPayout } from './api/PlatformPayoutQueries';
import { Button } from '../../shared/components/buttons/Button';
import { formatUSD } from '../../shared/utils/formatCurrency';
import {
  X, DollarSign, Mail, Phone, Check,
} from 'lucide-react';
import type { PayableEntity } from './api/PlatformPayoutTypes';

interface Props {
  entity: PayableEntity;
  onClose: () => void;
}

export default function PlatformRecordPayoutModal({ entity, onClose }: Props) {
  const recordMutation = useRecordPayout();
  const [amount, setAmount] = useState(String(entity.pending));
  const useConfigured = !!(entity.payment_method);
  const [overrideMethod, setOverrideMethod] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [notes, setNotes] = useState('');
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append('payable_type', entity.type);
    fd.append('payable_id', String(entity.id));
    fd.append('amount', amount);
    fd.append('payment_method', showOverride && overrideMethod.trim() ? overrideMethod.trim() : (entity.payment_method ?? ''));
    if (notes) fd.append('notes', notes);
    if (!isImmediate && scheduledAt) fd.append('scheduled_at', scheduledAt);
    if (files) {
      for (let i = 0; i < files.length; i++) {
        fd.append('attachments[]', files[i]);
      }
    }
    recordMutation.mutate(fd, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Record Payout</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">{entity.name}</p>
            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${entity.type === 'sales_rep' ? 'text-purple-700 bg-purple-100' : 'text-blue-700 bg-blue-100'}`}>
              {entity.type === 'sales_rep' ? 'Sales Rep' : 'User'}
            </span>
            <div className="pt-2 space-y-1.5 text-sm text-gray-600">
              {entity.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{entity.email}</span>
                </div>
              )}
              {entity.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{entity.phone}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-gray-200 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pending:</span>
                <strong className="text-amber-700">{formatUSD(entity.pending)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid to date:</span>
                <span className="text-gray-700">{formatUSD(entity.total_paid)}</span>
              </div>
            </div>
          </div>

          {useConfigured && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-2">
                <Check className="w-3.5 h-3.5" />
                Configured Payment Method
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="text-gray-400">Method:</span> {entity.payment_method}</p>
                {entity.mobile_money_provider && entity.mobile_money_number && (
                  <p><span className="text-gray-400">Mobile:</span> {entity.mobile_money_provider} — {entity.mobile_money_number}{entity.mobile_money_name ? ` (${entity.mobile_money_name})` : ''}</p>
                )}
                {(entity.bank_name && entity.bank_account_name) && (
                  <p><span className="text-gray-400">Bank:</span> {entity.bank_name} — {entity.bank_account_name}</p>
                )}
              </div>
              {!showOverride && (
                <button type="button" onClick={() => setShowOverride(true)}
                  className="text-xs text-gray-500 underline hover:text-gray-700 mt-1">
                  Override payment method
                </button>
              )}
            </div>
          )}

          {(!useConfigured || showOverride) && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Payment Method {useConfigured ? '(override)' : ''}
              </label>
              <input type="text" value={overrideMethod} onChange={(e) => setOverrideMethod(e.target.value)}
                placeholder="e.g. Mobile Money, Bank Transfer"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="number" step="0.01" min="0.01" max={entity.pending} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">When</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isImmediate} onChange={() => setIsImmediate(true)} className="accent-indigo-600" />
                <span className="text-sm text-gray-700">Now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isImmediate} onChange={() => setIsImmediate(false)} className="accent-indigo-600" />
                <span className="text-sm text-gray-700">Schedule</span>
              </label>
            </div>
            {!isImmediate && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Attachments (receipts, contracts)</label>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={recordMutation.isPending}
            disabled={!amount || Number(amount) <= 0 || (!isImmediate && !scheduledAt)}>
            {isImmediate ? 'Record Payment' : 'Schedule Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
