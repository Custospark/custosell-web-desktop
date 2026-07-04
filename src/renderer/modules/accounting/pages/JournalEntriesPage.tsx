import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Input } from '../../../shared/components/inputs/Input';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useJournalEntries, useCreateJournalEntry, usePostJournalEntry, useChartOfAccounts, useAccountingPeriods } from '../api/AccountingQueries';
import type { JournalEntry, JournalEntryLine } from '../api/AccountingTypes';
import { FileText, Plus, Send, X, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export default function JournalEntriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('');
  const filters = periodFilter ? { period_id: periodFilter } : undefined;
  const { data: entries, isLoading } = useJournalEntries(filters);
  const { data: periods } = useAccountingPeriods();
  const postEntry = usePostJournalEntry();

  const columns = [
    { key: 'entry_number', header: 'Entry #', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'description', header: 'Description' },
    { key: 'reference_type', header: 'Reference' },
    {
      key: 'total_debits',
      header: 'Total Debits',
      align: 'right' as const,
      render: (item: JournalEntry) => {
        const total = item.lines?.reduce((s, l) => s + Number(l.debit_amount), 0) ?? 0;
        return total.toLocaleString(undefined, { minimumFractionDigits: 2 });
      },
    },
    {
      key: 'total_credits',
      header: 'Total Credits',
      align: 'right' as const,
      render: (item: JournalEntry) => {
        const total = item.lines?.reduce((s, l) => s + Number(l.credit_amount), 0) ?? 0;
        return total.toLocaleString(undefined, { minimumFractionDigits: 2 });
      },
    },
    {
      key: 'posted',
      header: 'Status',
      render: (item: JournalEntry) => (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          item.posted_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
          {item.posted_at ? 'Posted' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: JournalEntry) =>
        !item.posted_at && (
          <Button size="sm" variant="ghost" onClick={() => postEntry.mutate(item.id)} loading={postEntry.isPending}>
            <Send className="w-3 h-3 mr-1" />Post
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Journal Entries</h1>
              <p className="text-sm text-gray-500">Record and manage journal entries</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Entry
          </Button>
        </div>
      </Card>

      <div className="flex gap-4 items-center">
        <Select
          label="Period"
          placeholder="All periods"
          options={(periods ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="w-52"
        />
      </div>

      <Table columns={columns} data={entries ?? []} loading={isLoading} rowKey={(item) => item.id} />

      {formOpen && (
        <NewJournalEntryForm
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function NewJournalEntryForm({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
    { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
  ]);

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts({ is_active: '1' });
  const createEntry = useCreateJournalEntry();
  const accountOptions = (accounts ?? []).map((a) => ({ value: String(a.id), label: `${a.code} - ${a.name}` }));
  const accountPlaceholder = accountsLoading ? 'Loading accounts...' : accountOptions.length === 0 ? 'No accounts found' : 'Select account';

  const totalDebits = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
  const totalCredits = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
  const balanced = totalDebits === totalCredits && totalDebits > 0;

  function addLine() {
    setLines([...lines, { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' }]);
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof JournalEntryLine, value: string | number) {
    setLines(lines.map((line, i) => i === idx ? { ...line, [field]: value } : line));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) return;
    createEntry.mutate({ date, description, lines }, { onSuccess: () => onClose() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Journal Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Brief description" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Entry Lines</label>
              <Button size="sm" variant="outline" type="button" onClick={addLine}>
                <PlusCircle className="w-3 h-3 mr-1" />Add Line
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {lines.map((line, idx) => (
                <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Select
                      placeholder={accountPlaceholder}
                      options={accountOptions}
                      value={line.account_id ? String(line.account_id) : ''}
                      onChange={(e) => updateLine(idx, 'account_id', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" min="0" placeholder="Debit" value={line.debit_amount || ''} onChange={(e) => updateLine(idx, 'debit_amount', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" min="0" placeholder="Credit" value={line.credit_amount || ''} onChange={(e) => updateLine(idx, 'credit_amount', Number(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <Input placeholder="Line desc (opt)" value={line.description || ''} onChange={(e) => updateLine(idx, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Total Debits: <strong className="text-gray-900">{totalDebits.toFixed(2)}</strong>
              </span>
              <span className="text-gray-500">
                Total Credits: <strong className="text-gray-900">{totalCredits.toFixed(2)}</strong>
              </span>
              <span className={cn('font-medium', balanced ? 'text-green-600' : 'text-red-500')}>
                {balanced ? 'Balanced' : 'Not Balanced'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!balanced} loading={createEntry.isPending}>Create Entry</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
