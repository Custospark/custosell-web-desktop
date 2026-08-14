import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Calendar,
  Coins,
  Layers,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useCreateHrCompensation,
  useCreateHrPayRun,
  useCreateHrSalaryStructure,
  useDeleteHrCompensation,
  useDeleteHrPayRun,
  useDeleteHrSalaryStructure,
  useHrCompensations,
  useHrEmployees,
  useHrPayRuns,
  useHrSalaryStructures,
  useUpdateHrSalaryStructure,
} from '../api/useHrQueries';
import { employeeDisplayName, type HrSalaryStructure } from '../api/hrTypes';
import { PayRunStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { formatShiftDate, formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '-';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default function HrPayrollPage() {
  const { confirm } = useConfirm();
  const { data: structures = [], isLoading: loadingStructures } = useHrSalaryStructures();
  const { data: compensations = [], isLoading: loadingComp } = useHrCompensations();
  const { data: payRuns = [], isLoading: loadingRuns } = useHrPayRuns();
  const { data: employees = [] } = useHrEmployees({ status: 'active' });
  const createStructure = useCreateHrSalaryStructure();
  const updateStructure = useUpdateHrSalaryStructure();
  const deleteStructure = useDeleteHrSalaryStructure();
  const createComp = useCreateHrCompensation();
  const deleteComp = useDeleteHrCompensation();
  const createRun = useCreateHrPayRun();
  const deleteRun = useDeleteHrPayRun();
  const [structureOpen, setStructureOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<HrSalaryStructure | null>(null);
  const [compOpen, setCompOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [compForm, setCompForm] = useState({
    employee_id: '',
    structure_id: '',
    basic_salary: '',
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [runForm, setRunForm] = useState({
    period_start: '',
    period_end: '',
  });

  function openCreateStructure() {
    setEditingStructure(null);
    setStructureName('');
    setStructureOpen(true);
  }

  function openEditStructure(s: HrSalaryStructure) {
    setEditingStructure(s);
    setStructureName(s.name);
    setStructureOpen(true);
  }

  async function handleStructure(e: React.FormEvent) {
    e.preventDefault();
    const name = structureName.trim();
    if (editingStructure) {
      await updateStructure.mutateAsync({ id: editingStructure.id, name, currency: editingStructure.currency });
    } else {
      await createStructure.mutateAsync({ name, currency: getBusinessCurrency() });

    }
    setStructureOpen(false);
    setEditingStructure(null);
    setStructureName('');
  }

  async function handleDeleteStructure(s: HrSalaryStructure) {
    const ok = await confirm({
      title: 'Delete salary structure?',
      message: `Remove “${s.name}”? Compensations that referenced it keep their salary amounts.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteStructure.mutateAsync(s.id);
  }

  async function handleDeleteComp(id: number, label: string) {
    const ok = await confirm({
      title: 'Delete compensation?',
      message: `Remove salary assignment for ${label}? Future pay runs will skip this row; past pay lines stay intact.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteComp.mutateAsync(id);
  }

  async function handleDeleteRun(id: number, period: string) {
    const ok = await confirm({
      title: 'Delete pay run?',
      message: `Remove the ${period} pay run? Calculated lines and payslips for this run will be removed.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteRun.mutateAsync(id);
  }

  async function handleComp(e: React.FormEvent) {
    e.preventDefault();
    await createComp.mutateAsync({
      employee_id: Number(compForm.employee_id),
      structure_id: compForm.structure_id ? Number(compForm.structure_id) : null,
      basic_salary: Number(compForm.basic_salary),
      effective_from: compForm.effective_from,
    });
    setCompOpen(false);
    setCompForm({
      employee_id: '',
      structure_id: '',
      basic_salary: '',
      effective_from: new Date().toISOString().slice(0, 10),
    });
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    await createRun.mutateAsync(runForm);
    setRunOpen(false);
    setRunForm({ period_start: '', period_end: '' });
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Wallet}
        title="Payroll"
        description="Salary structures, compensation, and pay runs - Uganda-first with PAYE and NSSF built in."
        actions={
          <Button size="sm" onClick={() => setRunOpen(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New pay run
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard
          title="Salary structures"
          description="Templates for how you pay."
          actions={
            <Button size="sm" variant="outline" onClick={openCreateStructure} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add structure
            </Button>
          }
        >
          {loadingStructures ? (
            <div className="flex justify-center py-8"><CustosellLoader /></div>
          ) : structures.length === 0 ? (
            <p className="text-sm text-gray-500">
              No structures yet - create one to organize compensation.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {structures.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{s.currency}</span>
                  </div>
                  <div className="inline-flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditStructure(s)}
                      className="inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deleteStructure.isPending}
                      onClick={() => void handleDeleteStructure(s)}
                      className="inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </HrSectionCard>

        <HrSectionCard
          title="Compensations"
          description="Basic salary per employee - required before calculating a pay run."
          actions={
            <Button size="sm" variant="outline" onClick={() => setCompOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Assign salary
            </Button>
          }
        >
          {loadingComp ? (
            <div className="flex justify-center py-8"><CustosellLoader /></div>
          ) : compensations.length === 0 ? (
            <p className="text-sm text-gray-500">
              Assign basic salary to active employees - then you can run payroll for a period.
            </p>
          ) : (
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Basic</th>
                    <th className="px-3 py-2">From</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compensations.map((c) => {
                    const label = c.employee ? employeeDisplayName(c.employee) : `#${c.employee_id}`;
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2">{label}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatMoney(c.basic_salary)}</td>
                        <td className="px-3 py-2 text-gray-600">{formatShiftDate(c.effective_from)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="danger"
                            loading={deleteComp.isPending}
                            onClick={() => void handleDeleteComp(c.id, label)}
                            className="inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </HrSectionCard>
      </div>

      <HrSectionCard title="Pay runs" description="Calculate → approve → post - each step locks in the numbers.">
        {loadingRuns ? (
          <div className="flex justify-center py-8"><CustosellLoader /></div>
        ) : payRuns.length === 0 ? (
          <HrEmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="No pay runs yet"
            description="Create a pay period when you're ready - we'll calculate PAYE and NSSF from assigned salaries."
            action={
              <Button onClick={() => setRunOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Start your first pay run
              </Button>
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payRuns.map((run) => {
                  const period = formatShiftDateRange(run.period_start, run.period_end);
                  const canDelete = run.status === 'draft' || run.status === 'calculated';
                  return (
                    <tr key={run.id} className="hover:bg-indigo-50/40">
                      <td className="px-3 py-2 font-medium text-gray-900">{period}</td>
                      <td className="px-3 py-2"><PayRunStatusBadge status={run.status} /></td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(run.total_gross)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(run.total_net)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link to={ROUTES.HR.PAY_RUN(run.id)} className="text-indigo-600 hover:underline">
                            Open
                          </Link>
                          {canDelete ? (
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:underline"
                              onClick={() => void handleDeleteRun(run.id, period)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <Modal
        isOpen={structureOpen}
        onClose={() => {
          setStructureOpen(false);
          setEditingStructure(null);
        }}
        title={editingStructure ? 'Edit salary structure' : 'Salary structure'}
        subtitle="A reusable template for how you pay people."
      >
        <form onSubmit={handleStructure} className="space-y-5">
          <HrModalHero
            icon={Layers}
            title={editingStructure ? 'Edit salary structure' : 'New salary structure'}
            description="The currency is set per business - you can assign it when setting compensation."
            tone="blue"
          />
          <HrFormSection title="Structure" icon={Layers}>
            <HrIconField label="Name" icon={Layers} required>
              <input
                required
                value={structureName}
                onChange={(e) => setStructureName(e.target.value)}
                placeholder="Standard"
                className={hrInputClass}
                autoFocus
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStructureOpen(false);
                setEditingStructure(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createStructure.isPending || updateStructure.isPending}>
              {editingStructure ? 'Save changes' : 'Create structure'}
            </Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={compOpen}
        onClose={() => setCompOpen(false)}
        title="Assign compensation"
        subtitle="Set basic salary for an active employee."
        size="lg"
      >
        <form onSubmit={handleComp} className="space-y-5">
          <HrModalHero
            icon={Banknote}
            title="Employee compensation"
            description="This basic salary drives gross pay - PAYE and NSSF are calculated from it during a pay run."
            tone="emerald"
          />
          <HrFormSection title="Assignment" icon={User} description="Pick the employee and their pay details.">
            <HrIconField label="Employee" icon={Users} required>
              <select
                required
                value={compForm.employee_id}
                onChange={(e) => setCompForm((f) => ({ ...f, employee_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">Select someone…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Salary structure" icon={Layers}>
              <select
                value={compForm.structure_id}
                onChange={(e) => setCompForm((f) => ({ ...f, structure_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">None</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </HrIconField>
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Basic salary" icon={Coins} required>
                <input
                  type="number"
                  min={0}
                  required
                  value={compForm.basic_salary}
                  onChange={(e) => setCompForm((f) => ({ ...f, basic_salary: e.target.value }))}
                  placeholder="1500000"
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Effective from" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={compForm.effective_from}
                  onChange={(e) => setCompForm((f) => ({ ...f, effective_from: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setCompOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createComp.isPending}>Save compensation</Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={runOpen}
        onClose={() => setRunOpen(false)}
        title="New pay run"
        subtitle="Define the period - you'll calculate and review before posting."
      >
        <form onSubmit={handleRun} className="space-y-5">
          <HrModalHero
            icon={Wallet}
            title="Pay period"
            description="After creating, open the run to calculate lines for every compensated employee."
            tone="indigo"
          />
          <HrFormSection title="Period" icon={Calendar} description="Usually matches your monthly or bi-weekly cycle.">
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Period start" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={runForm.period_start}
                  onChange={(e) => setRunForm((f) => ({ ...f, period_start: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Period end" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={runForm.period_end}
                  onChange={(e) => setRunForm((f) => ({ ...f, period_end: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createRun.isPending}>Create pay run</Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
