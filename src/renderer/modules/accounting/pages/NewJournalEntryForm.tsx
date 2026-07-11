import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Paperclip,
  PlusCircle,
  Scale,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';
import { useChartOfAccounts, useCreateJournalEntry } from '../api/AccountingQueries';
import type { JournalEntryLine } from '../api/AccountingTypes';

function FormModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

type LineSide = 'debit' | 'credit';

interface DraftLine {
  account_id: number;
  amount: number;
  side: LineSide;
  description: string;
}

const emptyLine = (side: LineSide = 'debit'): DraftLine => ({
  account_id: 0,
  amount: 0,
  side,
  description: '',
});

/** Money to integer minor units (avoids float equality / display noise). */
function toMinorUnits(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Parse amount input: strip commas/spaces; empty → 0; round to 2dp. */
function parseJournalAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, '').replace(/\s/g, '').trim();
  if (cleaned === '' || cleaned === '.') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return toMinorUnits(n) / 100;
}

function formatJournalAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toApiLines(draft: DraftLine[]): JournalEntryLine[] {
  return draft.map((line) => ({
    account_id: line.account_id,
    debit_amount: line.side === 'debit' ? line.amount : 0,
    credit_amount: line.side === 'credit' ? line.amount : 0,
    description: line.description,
  }));
}

export function NewJournalEntryForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine('debit'), emptyLine('credit')]);

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts({ is_active: '1' });
  const createEntry = useCreateJournalEntry();
  const accountOptions = (accounts ?? []).map((a) => ({
    value: String(a.id),
    label: `${a.code} — ${a.name}`,
  }));
  const accountPlaceholder = accountsLoading
    ? 'Loading accounts…'
    : accountOptions.length === 0
      ? 'No accounts found'
      : 'Select account…';

  const totalDebitsMinor = lines.reduce(
    (s, l) => s + (l.side === 'debit' ? toMinorUnits(l.amount) : 0),
    0,
  );
  const totalCreditsMinor = lines.reduce(
    (s, l) => s + (l.side === 'credit' ? toMinorUnits(l.amount) : 0),
    0,
  );
  const totalDebits = totalDebitsMinor / 100;
  const totalCredits = totalCreditsMinor / 100;
  const balanced = totalDebitsMinor === totalCreditsMinor && totalDebitsMinor > 0;
  const difference = Math.abs(totalDebitsMinor - totalCreditsMinor) / 100;
  const accountsReady = lines.every((l) => l.account_id > 0);
  const amountsReady = lines.every((l) => toMinorUnits(l.amount) > 0);
  const canSubmit = Boolean(date && description.trim() && accountsReady && amountsReady && balanced);

  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length % 2 === 0 ? 'debit' : 'credit')]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    createEntry.mutate(
      {
        date,
        description: description.trim(),
        lines: toApiLines(lines),
        attachment: attachment || undefined,
      },
      {
        onSuccess: () => {
          setDate(new Date().toISOString().slice(0, 10));
          setDescription('');
          setAttachment(null);
          setLines([emptyLine('debit'), emptyLine('credit')]);
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="New journal entry"
      subtitle="Record a balanced debit and credit posting to the general ledger."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PipelineModalHero
          icon={BookOpen}
          title="Manual journal"
          description="One amount per line — mark it Debit or Credit. Totals must match before you can create."
          tone="indigo"
        />

        <PipelineFormSection title="Header" icon={FileText} description="When and why this entry exists.">
          <div className="grid gap-3 sm:grid-cols-2">
            <PipelineIconField label="Date" icon={Calendar} required>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Description" icon={FileText} required>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Accrue July office rent"
                className={pipelineInputClass}
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection
          title="Entry lines"
          icon={Scale}
          description="At least two lines — typically one debit and one credit for the same amount."
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Pick the account, enter the amount once, then choose Debit or Credit.
            </p>
            <Button size="sm" variant="outline" type="button" onClick={addLine} className="inline-flex shrink-0 items-center gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Hash className="h-3.5 w-3.5" />
                    Line {idx + 1}
                  </span>
                  {lines.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <PipelineIconField label="Account" icon={BookOpen} required>
                    <select
                      required
                      value={line.account_id ? String(line.account_id) : ''}
                      onChange={(e) => updateLine(idx, { account_id: Number(e.target.value) || 0 })}
                      className={pipelineSelectClass}
                    >
                      <option value="">{accountPlaceholder}</option>
                      {accountOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </PipelineIconField>
                  <PipelineIconField label="Amount" icon={Scale} required>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={line.amount ? String(line.amount) : ''}
                      onChange={(e) => updateLine(idx, { amount: parseJournalAmount(e.target.value) })}
                      placeholder="e.g. 500000"
                      className={pipelineInputClass}
                    />
                  </PipelineIconField>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">
                      Side <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateLine(idx, { side: 'debit' })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                          line.side === 'debit'
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        Debit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLine(idx, { side: 'credit' })}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                          line.side === 'credit'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        Credit
                      </button>
                    </div>
                  </div>
                  <PipelineIconField label="Line note" icon={FileText}>
                    <input
                      value={line.description || ''}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="e.g. July rent accrual"
                      className={pipelineInputClass}
                    />
                  </PipelineIconField>
                </div>
              </div>
            ))}
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
              balanced
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950',
            )}
          >
            <div className="flex flex-wrap gap-4">
              <span>
                Total debits:{' '}
                <strong className="tabular-nums">{formatJournalAmount(totalDebits)}</strong>
              </span>
              <span>
                Total credits:{' '}
                <strong className="tabular-nums">{formatJournalAmount(totalCredits)}</strong>
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {balanced ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Balanced
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 text-amber-600" />
                  Not balanced
                  {difference > 0 ? (
                    <span className="font-normal opacity-80">
                      · off by {formatJournalAmount(difference)}
                    </span>
                  ) : (
                    <span className="font-normal opacity-80">· enter amounts on debit and credit lines</span>
                  )}
                </>
              )}
            </span>
          </div>
          {!canSubmit && (description.trim() || amountsReady || accountsReady) ? (
            <p className="text-xs text-amber-800">
              {!description.trim()
                ? 'Add a header description.'
                : !accountsReady
                  ? 'Select an account on every line.'
                  : !amountsReady
                    ? 'Enter an amount greater than zero on every line.'
                    : !balanced
                      ? 'Debit and credit totals must match (and one side must be Debit, the other Credit).'
                      : null}
            </p>
          ) : null}
        </PipelineFormSection>

        <PipelineFormSection title="Attachment" icon={Paperclip} description="Optional supporting document (receipt, invoice, PDF).">
          <PipelineIconField label="File" icon={Paperclip}>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xlsx"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className={cn(
                pipelineInputClass,
                'cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100',
              )}
            />
          </PipelineIconField>
          {attachment ? (
            <p className="text-xs text-gray-500">
              Selected: <span className="font-medium text-gray-700">{attachment.name}</span>
              {' '}({(attachment.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <p className="text-xs text-gray-400">No file chosen — e.g. rent_invoice_july.pdf</p>
          )}
        </PipelineFormSection>

        <FormModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit} loading={createEntry.isPending}>
            Create entry
          </Button>
        </FormModalFooter>
      </form>
    </Modal>
  );
}
