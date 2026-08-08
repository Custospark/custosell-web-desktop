import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { useToast } from '../../../app/contexts/useToast';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { PipelineModalHero, PipelineFormSection } from './estimatesShared';
import type { ProjectCostAllocation, AllocationType, CreateCostAllocationPayload } from '../api/projectTypes';
import { useCreateCostAllocation, useDeleteCostAllocation } from '../api/useProjectQueries';
import { DollarSign, Plus, Trash2, Wallet } from 'lucide-react';

const n = (v: unknown): number => Number(v) || 0;

const ALLOCATION_TYPES: { value: string; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'expense', label: 'Expense' },
  { value: 'other', label: 'Other' },
];

export default function AllocationTab({ projectId, allocations, currency }: {
  projectId: number;
  allocations: ProjectCostAllocation[];
  currency: string;
}) {
  const { showToast } = useToast();
  const [showAllocation, setShowAllocation] = useState(false);
  const [allocType, setAllocType] = useState<string>('overhead');
  const [allocDesc, setAllocDesc] = useState('');
  const [allocAmount, setAllocAmount] = useState(0);
  const [allocDate, setAllocDate] = useState(new Date().toISOString().slice(0, 10));
  const createAllocation = useCreateCostAllocation(projectId);
  const deleteAllocation = useDeleteCostAllocation(projectId);

  const handleRecordAllocation = async () => {
    if (!allocDesc.trim() || allocAmount <= 0) return;
    const payload: CreateCostAllocationPayload = {
      allocation_type: allocType as AllocationType,
      description: allocDesc.trim(),
      amount: allocAmount,
      allocation_date: allocDate || new Date().toISOString().slice(0, 10),
    };
    try {
      await createAllocation.mutateAsync(payload);
      setShowAllocation(false);
      setAllocDesc('');
      setAllocAmount(0);
      setAllocType('overhead');
      showToast('success', 'Cost allocation recorded');
    } catch {
      /* toast handled in mutation */
    }
  };

  const handleDeleteAllocation = async (allocationId: number) => {
    try {
      await deleteAllocation.mutateAsync(allocationId);
      showToast('success', 'Allocation removed');
    } catch {
      /* toast handled in mutation */
    }
  };

  return (
    <>
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Cost allocations
          </div>
          <Button size="sm" onClick={() => setShowAllocation(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Record allocation
          </Button>
        </div>

        {allocations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <DollarSign className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No allocations recorded</p>
            <p className="mt-1 text-xs text-gray-500">Record overhead, material, and other costs against the project budget.</p>
            <Button size="sm" className="mt-4" onClick={() => setShowAllocation(true)}>
              <Plus className="h-4 w-4" />
              Record allocation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                        {a.allocation_type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-800">{a.description}</td>
                    <td className="py-2.5 pr-4 font-medium tabular-nums text-gray-900">{formatCurrency(a.amount, currency)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-gray-500">{formatShiftDate(a.allocation_date)}</td>
                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteAllocation(a.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Remove allocation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {allocations.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Total allocated</span>
            <span className="font-bold tabular-nums text-gray-900">
              {formatCurrency(allocations.reduce((sum, a) => sum + n(a.amount), 0), currency)}
            </span>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showAllocation}
        onClose={() => setShowAllocation(false)}
        title="Record cost allocation"
        size="md"
      >
        <AllocationModal
          allocType={allocType}
          allocDesc={allocDesc}
          allocAmount={allocAmount}
          allocDate={allocDate}
          isPending={createAllocation.isPending}
          onTypeChange={(v) => setAllocType(v)}
          onDescChange={(v) => setAllocDesc(v)}
          onAmountChange={(v) => setAllocAmount(v)}
          onDateChange={(v) => setAllocDate(v)}
          onCancel={() => setShowAllocation(false)}
          onSubmit={() => handleRecordAllocation()}
        />
      </Modal>
    </>
  );
}

function AllocationModal({ allocType, allocDesc, allocAmount, allocDate, isPending, onTypeChange, onDescChange, onAmountChange, onDateChange, onCancel, onSubmit }: {
  allocType: string;
  allocDesc: string;
  allocAmount: number;
  allocDate: string;
  isPending: boolean;
  onTypeChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onAmountChange: (v: number) => void;
  onDateChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <PipelineModalHero
        icon={Wallet}
        title="Add cost to project"
        description="Record indirect costs like overhead, materials, or expenses against the project budget."
        tone="indigo"
      />

      <PipelineFormSection title="Allocation details" icon={DollarSign}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={allocType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ALLOCATION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Input
          label="Description"
          value={allocDesc}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="e.g. Transport, permits, office supplies"
        />
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={allocAmount}
          onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
        />
        <Input
          label="Date"
          type="date"
          value={allocDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </PipelineFormSection>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onSubmit}
          loading={isPending}
          disabled={!allocDesc.trim() || allocAmount <= 0}
        >
          <Plus className="h-4 w-4" />
          Record allocation
        </Button>
      </div>
    </div>
  );
}