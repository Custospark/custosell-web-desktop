import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import {
  useCreateIncome, useUpdateIncome,
  useUploadIncomeAttachment, useCreateIncomeAttachmentLink, useDeleteIncomeAttachment,
} from '../api/IncomeQueries';
import { useIncomeSource } from '../api/IncomeQueries';
import { useBudgetsIndex } from '../api/BudgetQueries';
import BudgetPicker from './BudgetPicker';
import {
  Calendar, FileText, Tag, Paperclip, Link, Trash2, File, Wallet, Repeat,
} from 'lucide-react';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { formatFileSize } from '../../../shared/utils/formatFileSize';
import type { IncomeSource, IncomeAttachment } from '../api/IncomeTypes';

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  income?: IncomeSource | null;
}

function AttachmentList({ incomeId, attachments }: { incomeId: number; attachments?: IncomeAttachment[] }) {
  const deleteAtt = useDeleteIncomeAttachment(incomeId);

  if (!attachments?.length) return null;

  return (
    <div className="space-y-1.5">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {att.type === 'link' ? (
              <Link className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <a
              href={att.type === 'link' ? att.link_url! : att.file_url!}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate"
            >
              {att.file_name}
            </a>
            {att.file_size && (
              <span className="text-xs text-gray-400 hidden sm:inline">{formatFileSize(att.file_size)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => deleteAtt.mutate(att.id)}
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function IncomeForm({ open, onClose, income }: IncomeFormProps) {
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const { data: budgets } = useBudgetsIndex({ status: 'active' });

  const isEditing = !!income;

  const [sourceName, setSourceName] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  const [savedIncomeId, setSavedIncomeId] = useState<number | null>(income?.id ?? null);
  const { data: freshIncome } = useIncomeSource(savedIncomeId ?? 0);
  const displayIncome = freshIncome ?? income;

  const [fileUploading, setFileUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLink, setPendingLink] = useState<{ url: string; title: string } | null>(null);

  const uploadAtt = useUploadIncomeAttachment();
  const createLinkAtt = useCreateIncomeAttachmentLink();

  useEffect(() => {
    queueMicrotask(() => {
      if (income) {
        setSavedIncomeId(income.id);
        setSourceName(income.source_name);
        setBudgetId(income.budget_id?.toString() || '');
        setAmount(parseFloat(income.amount).toString());
        setDescription(income.description || '');
        setIncomeDate(income.income_date.split('T')[0] || income.income_date);
        setIsRecurring(!!income.is_recurring);
        setRecurrenceInterval((income.recurrence_interval as typeof recurrenceInterval) ?? 'monthly');
        setNextDueDate(income.next_due_date?.split('T')[0] || '');
      } else {
        setSavedIncomeId(null);
        setSourceName('');
        setBudgetId('');
        setAmount('');
        setDescription('');
        setIncomeDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setRecurrenceInterval('monthly');
        setNextDueDate('');
        setLinkUrl('');
        setLinkTitle('');
        setPendingFile(null);
      }
    });
  }, [income, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim() || !amount) return;

    const payload = {
      budget_id: budgetId ? Number(budgetId) : null,
      source_name: sourceName.trim(),
      amount: parseFloat(amount),
      description: description.trim() || null,
      income_date: incomeDate,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : null,
      next_due_date: isRecurring ? (nextDueDate || null) : null,
    };

    let incomeId: number;
    try {
      if (isEditing && income) {
        await updateMutation.mutateAsync({ id: income.id, data: payload });
        incomeId = income.id;
      } else {
        const created = await createMutation.mutateAsync(payload);
        incomeId = created.id;
        setSavedIncomeId(incomeId);
      }
      if (pendingFile) {
        setFileUploading(true);
        await uploadAtt.mutateAsync({ incomeSourceId: incomeId, file: pendingFile });
        setPendingFile(null);
        setFileUploading(false);
      }
      if (pendingLink) {
        await createLinkAtt.mutateAsync({ incomeSourceId: incomeId, url: pendingLink.url, title: pendingLink.title || undefined });
        setPendingLink(null);
      }
    } finally {
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleQueueLink = () => {
    if (!linkUrl.trim()) return;
    setPendingLink({ url: linkUrl.trim(), title: linkTitle.trim() });
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleRemovePendingLink = () => {
    setPendingLink(null);
  };

  const isPending = createMutation.isPending || updateMutation.isPending || fileUploading;
  const hasPendingLink = pendingLink !== null;
  const title = isEditing ? 'Edit Income' : 'Record Income';
  const subtitle = isEditing ? 'Update the income details below.' : 'Add money you received — from salary, freelance, sales, or any other source.';

  const attachments = displayIncome?.attachments;

  return (
    <Modal isOpen={open} onClose={onClose} title={title} subtitle={subtitle} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Hero ────────────────────────────────────────── */}
        <div className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">
              {isEditing ? 'Edit income record' : 'New income record'}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {isEditing
                ? 'Update the source, amount, or date below.'
                : 'Record any money coming in — track where your income comes from.'}
            </p>
          </div>
        </div>

        {/* ── Income Details ───────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-400" /> Income Details
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source name *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="e.g. Freelance project, Salary, Side hustle"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date received *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Budget ──────────────────────────────────────── */}
        <BudgetPicker value={budgetId} onChange={setBudgetId} budgets={(budgets?.budgets ?? []).map((b) => ({ id: b.id, name: b.name }))} />

        {/* ── Recurring ────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-gray-400" /> Repeating income
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              This income comes in again on a schedule (e.g. salary, rent)
            </label>
            {isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeats every</label>
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value as typeof recurrenceInterval)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    <option value="daily">Day</option>
                    <option value="weekly">Week</option>
                    <option value="monthly">Month</option>
                    <option value="yearly">Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next due (optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Description ──────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Notes
            </h3>
          </div>
          <div className="p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm min-h-[80px] focus:border-blue-400 focus:outline-none resize-none"
              placeholder="Add a note about this income — client name, project reference, payment method…"
            />
          </div>
        </div>

        {/* ── Attachments ──────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-gray-400">Upload receipts, contracts, or invoices — or add a reference link.</p>

            <AttachmentList incomeId={savedIncomeId ?? 0} attachments={attachments} />

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xlsx,.txt,.csv"
                onChange={handleFileSelect}
                disabled={fileUploading || !!pendingFile}
                className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-40"
              />
              {pendingFile && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <File className="w-3.5 h-3.5" />
                  {pendingFile.name}
                </span>
              )}
            </div>

            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Link label (optional)"
                  disabled={hasPendingLink}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none disabled:opacity-40"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/…"
                    disabled={hasPendingLink}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none disabled:opacity-40"
                  />
                  {hasPendingLink ? (
                    <button
                      type="button"
                      onClick={handleRemovePendingLink}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleQueueLink}
                      disabled={!linkUrl.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-40"
                    >
                      <Link className="h-4 w-4" />
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isEditing ? 'Done' : 'Cancel'}
          </Button>
          {!isEditing && (
            <Button type="submit" loading={isPending} disabled={!sourceName.trim() || !amount || isPending}>
              <Wallet className="h-4 w-4" />
              Save Income
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
