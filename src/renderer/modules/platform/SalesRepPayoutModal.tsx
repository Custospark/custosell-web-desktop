import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES_REPS } from '../../shared/api/endpoints/endpoints';
import { useToast } from '../../app/contexts/useToast';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { formatUSD } from '../../shared/utils/formatCurrency';
import {
  DollarSign, History, Wallet, Smartphone, Landmark,
  CalendarDays, Paperclip, X, FileText, Image, Phone, Check,
} from 'lucide-react';
import { PipelineModalHero, PipelineFormSection, PipelineIconField } from '../pipeline/ui/pipelineFormFields';
import type { PlatformSalesRep } from './PlatformSalesRepFormModal';

interface Attachment {
  path: string;
  original_name: string;
  mime_type: string;
  size: number;
}

interface Payout {
  id: number;
  sales_rep_id: number;
  amount: string;
  payment_method: string | null;
  notes: string | null;
  attachments: Attachment[] | null;
  paid_at: string;
  paid_by: number | null;
  paid_by_user?: { id: number; name: string };
}

export function SalesRepPayoutModal({ rep, onClose }: { rep: PlatformSalesRep | null; onClose: () => void }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [payoutFiles, setPayoutFiles] = useState<File[]>([]);

  const { data: payouts = [] } = useQuery<Payout[]>({
    queryKey: ['sales-reps', rep?.id, 'payouts'],
    queryFn: async () => {
      if (!rep) return [];
      const { data } = await axiosInstance.get(SALES_REPS.PAYOUTS(rep.id));
      return data.data ?? [];
    },
    enabled: !!rep,
  });

  const totalEarned = rep?.total_commission ?? 0;
  const totalPaid = payouts.reduce((s, p) => s + Number(p.amount), 0);
  const pending = Math.max(0, totalEarned - totalPaid);

  const recordMutation = useMutation({
    mutationFn: async () => {
      if (!rep) return;
      const scheduled = !isImmediate && scheduledAt ? scheduledAt : null;
      const payload: Record<string, unknown> = {
        amount,
        payment_method: paymentMethod || null,
        notes: notes || null,
        ...(scheduled ? { scheduled_at: scheduled } : { paid_at: new Date().toISOString() }),
      };
      if (payoutFiles.length > 0) {
        const fd = new FormData();
        fd.append('amount', amount);
        fd.append('payment_method', paymentMethod || '');
        fd.append('notes', notes || '');
        if (scheduled) {
          fd.append('scheduled_at', scheduled);
        } else {
          fd.append('paid_at', new Date().toISOString());
        }
        payoutFiles.forEach((f) => fd.append('attachments[]', f));
        await axiosInstance.post(SALES_REPS.PAYOUTS(rep.id), fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post(SALES_REPS.PAYOUTS(rep.id), payload);
      }
    },
    onSuccess: () => {
      showToast('success', 'Payout recorded');
      queryClient.invalidateQueries({ queryKey: ['sales-reps', rep?.id, 'payouts'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'sales-reps'] });
      setAmount('');
      setPaymentMethod('');
      setNotes('');
      setIsImmediate(true);
      setScheduledAt('');
      setPayoutFiles([]);
    },
    onError: (err: Error) => {
      const axiosErr = err as AxiosError<{ message: string }>;
      showToast('error', axiosErr.response?.data?.message || 'Failed to record payout');
    },
  });

  return (
    <Modal isOpen={!!rep} onClose={onClose} title="" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={DollarSign}
          title={`Payouts — ${rep?.user?.name ?? 'Sales Rep'}`}
          description={`${rep?.user?.email} · ${rep?.referral_code?.code ?? 'No code'}`}
          tone="emerald"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total Earned</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatUSD(totalEarned)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Already Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatUSD(totalPaid)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            Available to Pay: {formatUSD(pending)}
          </p>
        </div>

        {/* Contact & configured payment info */}
        {(rep?.phone || rep?.payment_method) && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-2">
              <Check className="w-3.5 h-3.5" />
              Sales Rep Details
            </div>
            <div className="text-sm text-gray-600 space-y-1.5">
              {rep?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{rep.phone}</span>
                </div>
              )}
              {rep?.region && (
                <p><span className="text-gray-400">Region:</span> {rep.region}</p>
              )}
              {rep?.payment_method && (
                <p><span className="text-gray-400">Payout Method:</span> {rep.payment_method === 'mobile_money' ? 'Mobile Money' : rep.payment_method === 'bank' ? 'Bank Transfer' : rep.payment_method}</p>
              )}
              {rep?.mobile_money_provider && rep?.mobile_money_number && (
                <p><span className="text-gray-400">Mobile Money:</span> {rep.mobile_money_provider} — {rep.mobile_money_number}{rep.mobile_money_name ? ` (${rep.mobile_money_name})` : ''}</p>
              )}
              {(rep?.bank_name && rep?.bank_account_name) && (
                <p><span className="text-gray-400">Bank:</span> {rep.bank_name} — {rep.bank_account_name}{rep.bank_account_number ? ` · ${rep.bank_account_number}` : ''}</p>
              )}
            </div>
          </div>
        )}

        {/* Record new payout */}
        <PipelineFormSection title="Record a Payout" icon={Wallet}>
          <PipelineIconField label="Amount" icon={DollarSign} required>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. 50000"
            />
          </PipelineIconField>
          <PipelineIconField label="Payment Method" icon={rep?.payment_method === 'bank' ? Landmark : Smartphone}>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select method</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </PipelineIconField>
          <PipelineIconField label="When" icon={CalendarDays}>
            <div className="flex gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isImmediate} onChange={() => setIsImmediate(true)} className="accent-emerald-600" />
                <span className="text-sm text-gray-700">Now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isImmediate} onChange={() => setIsImmediate(false)} className="accent-emerald-600" />
                <span className="text-sm text-gray-700">Schedule</span>
              </label>
            </div>
            {!isImmediate && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            )}
          </PipelineIconField>

          <PipelineIconField label="Notes" icon={History}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Optional notes about this payout"
            />
          </PipelineIconField>
          <PipelineIconField label="Attachments" icon={Paperclip}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPayoutFiles((prev) => [...prev, ...files].slice(0, 5));
              }}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              {payoutFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                  {f.type.startsWith('image/') ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  <span className="max-w-32 truncate">{f.name}</span>
                  <button type="button" onClick={() => setPayoutFiles((p) => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {payoutFiles.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  + Add file
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Images or PDFs, max 5MB each (up to 5 files)</p>
          </PipelineIconField>
          <div className="flex justify-end pt-1">
            <Button onClick={() => recordMutation.mutate()} disabled={recordMutation.isPending || !amount || Number(amount) <= 0 || (!isImmediate && !scheduledAt)}>
              {recordMutation.isPending ? 'Recording...' : isImmediate ? 'Record Payout' : 'Schedule Payout'}
            </Button>
          </div>
        </PipelineFormSection>

        {/* Payout history */}
        <PipelineFormSection title="Payout History" icon={History}>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No payouts recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatUSD(p.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.paid_at).toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {p.payment_method ? ` · ${p.payment_method.replace('_', ' ')}` : ''}
                    </p>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                    {p.attachments && p.attachments.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {p.attachments.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded bg-gray-200/60 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {a.mime_type?.startsWith('image/') ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {a.original_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">#{p.id}</span>
                </div>
              ))}
            </div>
          )}
        </PipelineFormSection>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
