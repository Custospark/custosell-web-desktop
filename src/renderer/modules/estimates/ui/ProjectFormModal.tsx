import { useState, useEffect, useMemo } from 'react';
import { useCreateProject, useUpdateProject } from '../api/useProjectQueries';
import { useCustomers } from '../../customers/api/customers/CustomerQueries';
import type { CreateProjectPayload, Project, UpdateProjectPayload } from '../api/projectTypes';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';
import {
  FolderKanban,
  UserRound,
  CalendarDays,
  Wallet,
  FileText,
  Check,
  Target,
  DollarSign,
} from 'lucide-react';

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}

const STATUS_OPTIONS: { value: CreateProjectPayload['status']; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ProjectFormModal({ open, onClose, project }: ProjectFormModalProps) {
  const isEditing = !!project;
  const { data: customers = [] } = useCustomers();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const currency = getBusinessCurrency();

  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<CreateProjectPayload['status']>('planning');
  const [budgetRevenue, setBudgetRevenue] = useState('');
  const [budgetCost, setBudgetCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setName(project?.name ?? '');
      setCustomerId(project?.customer_id ? String(project.customer_id) : '');
      setStatus(project?.status ?? 'planning');
      setBudgetRevenue(project?.budget_revenue != null ? String(project.budget_revenue) : '');
      setBudgetCost(project?.budget_cost != null ? String(project.budget_cost) : '');
      setStartDate(project?.start_date?.slice(0, 10) ?? '');
      setDueDate(project?.due_date?.slice(0, 10) ?? '');
      setDescription(project?.description ?? '');
    });
  }, [open, project]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const base: CreateProjectPayload = {
      name: name.trim(),
      customer_id: customerId ? Number(customerId) : null,
      status,
      budget_revenue: budgetRevenue !== '' ? Number(budgetRevenue) : undefined,
      budget_cost: budgetCost !== '' ? Number(budgetCost) : undefined,
      start_date: startDate || null,
      due_date: dueDate || null,
      description: description.trim() || null,
    };

    if (isEditing && project) {
      updateMutation.mutate({ id: project.id, payload: base as UpdateProjectPayload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(base, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isEditing ? `Edit ${project?.project_number ?? 'project'}` : 'New project'}
      size="xl"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={FolderKanban}
          tone="indigo"
          title={isEditing ? 'Update project' : 'Create a new project'}
          description="Track delivery, budget vs actual, and job costing."
        />

        <PipelineFormSection title="Project details" icon={FolderKanban} description="Name, customer, and status.">
          <PipelineIconField label="Project name" icon={FolderKanban} required>
            <input
              className={pipelineInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </PipelineIconField>

          <div>
            <div className="mb-1.5 flex items-center gap-1">
              <label className="text-sm font-medium text-gray-700">Customer</label>
            </div>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                className={pipelineSelectClass}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">No customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <PipelineIconField label="Status" icon={Check}>
            <select
              className={pipelineSelectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as CreateProjectPayload['status'])}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Timeline" icon={CalendarDays} description="Start and due dates.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label="Start date" icon={CalendarDays}>
              <input
                className={`${pipelineInputClass} [appearance:auto]`}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </PipelineIconField>
            <PipelineIconField label="Due date" icon={CalendarDays}>
              <input
                className={`${pipelineInputClass} [appearance:auto]`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Budget" icon={Wallet} description={`Budgeted revenue and cost in ${currency}.`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label={`Budget revenue (${currency})`} icon={Target}>
              <input
                className={pipelineInputClass}
                type="number"
                step="0.01"
                min={0}
                value={budgetRevenue}
                onChange={(e) => setBudgetRevenue(e.target.value)}
                placeholder="0.00"
              />
            </PipelineIconField>
            <PipelineIconField label={`Budget cost (${currency})`} icon={DollarSign}>
              <input
                className={pipelineInputClass}
                type="number"
                step="0.01"
                min={0}
                value={budgetCost}
                onChange={(e) => setBudgetCost(e.target.value)}
                placeholder="0.00"
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Description" icon={FileText} description="Optional notes.">
          <PipelineIconField label="Description" icon={FileText}>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </PipelineIconField>
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {isEditing ? 'Save project' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}