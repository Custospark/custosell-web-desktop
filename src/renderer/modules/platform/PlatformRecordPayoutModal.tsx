import { useState, useRef } from 'react';
import { useRecordPayout } from './api/PlatformPayoutQueries';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { formatUSD } from '../../shared/utils/formatCurrency';
import {
  Wallet, DollarSign, Mail, Check, Smartphone, Landmark,
  Paperclip, X, FileText, Image, Zap, CalendarClock,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { PipelineModalHero, PipelineFormSection, PipelineIconField, pipelineLabelClass } from '../pipeline/ui/pipelineFormFields';
import type { PayableEntity } from './api/PlatformPayoutTypes';

interface Props {
  entity: PayableEntity;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  bank: 'Bank Transfer',
  cash: 'Cash',
  other: 'Other',
};

export default function PlatformRecordPayoutModal({ entity, onClose }: Props) {
  const recordMutation = useRecordPayout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(String(entity.pending));
  const useConfigured = !!(entity.payment_method);
  const [overrideMethod, setOverrideMethod] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [notes, setNotes] = useState('');
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append('payable_type', entity.type);
    fd.append('payable_id', String(entity.id));
    fd.append('amount', amount);
    fd.append('payment_method', showOverride && overrideMethod.trim() ? overrideMethod.trim() : (entity.payment_method ?? ''));
    if (notes) fd.append('notes', notes);
    if (!isImmediate && scheduledAt) fd.append('scheduled_at', scheduledAt);
    files.forEach((f) => fd.append('attachments[]', f));
    recordMutation.mutate(fd, { onSuccess: () => onClose() });
  };

  return (
    <Modal isOpen onClose={onClose} title="" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={DollarSign}
          title={`Record Payout — ${entity.name}`}
          description={
            `${entity.type === 'sales_rep' ? 'Sales Rep' : 'User'} · ${entity.email ?? ''}${entity.code ? ` · ${entity.code}` : ''}`
          }
          tone="emerald"
        />

        <div className="grid grid-cols-2 gap-3 px-1">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Due</p>
            <p className="text-lg font-semibold text-amber-700">{formatUSD(entity.pending)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Paid to Date</p>
            <p className="text-lg font-semibold text-green-700">{formatUSD(entity.total_paid)}</p>
          </div>
        </div>

        {useConfigured && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2 mx-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-2">
              <Check className="w-3.5 h-3.5" />
              Configured Payment Method
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="text-gray-400">Method:</span> {PAYMENT_METHOD_LABELS[entity.payment_method ?? ''] ?? entity.payment_method}</p>
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

        <PipelineFormSection title="Payout Details" icon={Wallet}>
          <PipelineIconField label="Amount (USD)" icon={DollarSign} required>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={entity.pending}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="0.00"
            />
          </PipelineIconField>

          {(!useConfigured || showOverride) && (
            <PipelineIconField label={`Payment Method${useConfigured ? ' (override)' : ''}`} icon={entity.payment_method === 'bank' ? Landmark : Smartphone}>
              <input
                type="text"
                value={overrideMethod}
                onChange={(e) => setOverrideMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={useConfigured ? 'Override payment method…' : 'e.g. Mobile Money, Bank Transfer'}
              />
            </PipelineIconField>
          )}

          <div>
            <label className={pipelineLabelClass}>When</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsImmediate(true)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  isImmediate
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <Zap className="h-4 w-4" />
                Now
              </button>
              <button
                type="button"
                onClick={() => setIsImmediate(false)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  !isImmediate
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <CalendarClock className="h-4 w-4" />
                Schedule
              </button>
            </div>
            {!isImmediate && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            )}
          </div>

          <PipelineIconField label="Notes" icon={Mail}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Optional notes about this payout"
            />
          </PipelineIconField>

          <div>
            <label className={cn(pipelineLabelClass, 'flex items-center gap-1.5')}>
              <Paperclip className="h-4 w-4 text-gray-400" />
              Attachments
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={(e) => {
                const incoming = Array.from(e.target.files ?? []);
                setFiles((prev) => [...prev, ...incoming].slice(0, 5));
              }}
              className="hidden"
            />
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-3">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700">
                      {f.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      <span className="max-w-32 truncate">{f.name}</span>
                      <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  + Add file
                </button>
              )}
              <p className="mt-2 text-center text-xs text-gray-400">Images or PDFs, max 5MB each (up to 5 files)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} loading={recordMutation.isPending}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > entity.pending || (!isImmediate && !scheduledAt)}>
              {isImmediate ? 'Record Payment' : 'Schedule Payment'}
            </Button>
          </div>
        </PipelineFormSection>
      </div>
    </Modal>
  );
}
