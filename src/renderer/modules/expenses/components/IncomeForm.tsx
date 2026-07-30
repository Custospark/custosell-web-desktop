import { useState, useEffect } from 'react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { useCreateIncome, useUpdateIncome } from '../api/IncomeQueries';
import { DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import type { IncomeSource } from '../api/IncomeTypes';

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  income?: IncomeSource | null;
}

export default function IncomeForm({ open, onClose, income }: IncomeFormProps) {
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();

  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const isEditing = !!income;

  useEffect(() => {
    queueMicrotask(() => {
      if (income) {
        setSourceName(income.source_name);
        setAmount(parseFloat(income.amount).toString());
        setDescription(income.description || '');
        setIncomeDate(income.income_date.split('T')[0] || income.income_date);
      } else {
        setSourceName('');
        setAmount('');
        setDescription('');
        setIncomeDate(new Date().toISOString().split('T')[0]);
      }
    });
  }, [income, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim() || !amount) return;

    const payload = {
      source_name: sourceName.trim(),
      amount: parseFloat(amount),
      description: description.trim() || null,
      income_date: incomeDate,
    };

    if (isEditing && income) {
      await updateMutation.mutateAsync({ id: income.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SlideDrawer open={open} onClose={onClose} title={isEditing ? 'Edit Income' : 'Record Income'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Tag className="h-4 w-4 text-gray-400" />
            Source Name
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. Freelance, Salary, Side Hustle"
            required
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <DollarSign className="h-4 w-4 text-gray-400" />
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-gray-400" />
            Date
          </label>
          <input
            type="date"
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
            required
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <FileText className="h-4 w-4 text-gray-400" />
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note about this income…"
            rows={3}
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !sourceName.trim() || !amount}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-900 transition-all disabled:opacity-50"
          >
            {isPending ? 'Saving…' : isEditing ? 'Update' : 'Save Income'}
          </button>
        </div>
      </form>
    </SlideDrawer>
  );
}
