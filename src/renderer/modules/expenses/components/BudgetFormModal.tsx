import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreateBudget, useUpdateBudget } from '../api/BudgetQueries';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { Target, Wallet, CalendarDays, FileText, PiggyBank } from 'lucide-react';
import type { PersonalBudget, PersonalBudgetSummaryRow } from '../api/BudgetTypes';

type BudgetLike = Pick<PersonalBudget, 'id' | 'name' | 'description' | 'planned_amount' | 'period_start' | 'period_end'> & Partial<PersonalBudgetSummaryRow>;

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  budget?: BudgetLike | null;
}

function syncBudgetForm(
  budget: BudgetLike | null | undefined,
  set: (name: string, description: string, amount: string, start: string, end: string) => void,
) {
  const name = budget?.name ?? '';
  const description = budget?.description ?? '';
  const amount = budget?.planned_amount != null ? parseFloat(String(budget.planned_amount)).toString() : '';
  const start = budget?.period_start ?? '';
  const end = budget?.period_end ?? '';
  set(name, description, amount, start, end);
}

export default function BudgetFormModal({ open, onClose, budget }: BudgetFormModalProps) {
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();

  const isEditing = !!budget;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      syncBudgetForm(budget, (n, d, a, s, e) => {
        setName(n);
        setDescription(d);
        setPlannedAmount(a);
        setPeriodStart(s);
        setPeriodEnd(e);
      });
    });
  }, [budget, open]);

  const handleSubmit = () => {
    if (!name.trim() || !plannedAmount) return;
    const data = {
      name: name.trim(),
      description: description.trim() || null,
      planned_amount: parseFloat(plannedAmount),
      period_start: periodStart || null,
      period_end: periodEnd || null,
    };
    if (isEditing && budget) {
      updateMutation.mutate({ id: budget.id, data }, { onSuccess: onClose });
    } else {
      createMutation.mutate(data, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !!name.trim() && !!plannedAmount && parseFloat(plannedAmount) >= 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? 'Edit your budget' : 'Create a new budget'}
      subtitle={isEditing ? 'Update your budget goals below.' : 'Give your savings or spending goal a name and a target.'}
      size="lg"
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">

        <div className="flex items-start gap-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <PiggyBank className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">
              {isEditing ? 'Edit your budget' : 'A new money goal'}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {isEditing
                ? 'Update the name, target, or dates — linked income and expenses stay attached.'
                : 'Budgets are like named piggy banks — e.g. "Groceries", "June holiday", or "House savings". Track how much you plan vs what you actually spend.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" /> Budget details
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget name *</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="e.g. Groceries, Transport, June holiday"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How much is the plan? *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">{getBusinessCurrency()}</span>
                <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number" step="0.01" min="0"
                  value={plannedAmount}
                  onChange={(e) => setPlannedAmount(e.target.value)}
                  className="w-full pl-12 pr-10 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Covers from (optional)</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">until (optional)</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Leave the dates empty to keep this budget open-ended. Your expenses and income can be linked to it from their forms.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm min-h-[70px] focus:border-blue-400 focus:outline-none resize-none"
                  placeholder="A short note about this budget — e.g. save for a new phone"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isPending} disabled={!canSubmit}>
            <PiggyBank className="h-4 w-4" />
            {isEditing ? 'Save changes' : 'Create budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}