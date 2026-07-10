import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useCreateHrCompensation,
  useCreateHrPayRun,
  useCreateHrSalaryStructure,
  useHrCompensations,
  useHrEmployees,
  useHrPayRuns,
  useHrSalaryStructures,
} from '../api/useHrQueries';
import { employeeDisplayName } from '../api/hrTypes';
import { PayRunStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default function HrPayrollPage() {
  const { data: structures = [], isLoading: loadingStructures } = useHrSalaryStructures();
  const { data: compensations = [], isLoading: loadingComp } = useHrCompensations();
  const { data: payRuns = [], isLoading: loadingRuns } = useHrPayRuns();
  const { data: employees = [] } = useHrEmployees({ status: 'active' });
  const createStructure = useCreateHrSalaryStructure();
  const createComp = useCreateHrCompensation();
  const createRun = useCreateHrPayRun();

  const [structureOpen, setStructureOpen] = useState(false);
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

  async function handleStructure(e: React.FormEvent) {
    e.preventDefault();
    await createStructure.mutateAsync({ name: structureName.trim(), currency: 'UGX' });
    setStructureOpen(false);
    setStructureName('');
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
    <div className="space-y-4">
      <HrPageHeader
        title="Payroll"
        description="Salary structures, employee compensation, and pay runs (Uganda PAYE / NSSF)."
        actions={
          <Button size="sm" onClick={() => setRunOpen(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New pay run
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard
          title="Salary structures"
          actions={
            <Button size="sm" variant="outline" onClick={() => setStructureOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          }
        >
          {loadingStructures ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : structures.length === 0 ? (
            <p className="text-sm text-gray-500">No structures yet. Create one (e.g. “Standard UGX”).</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {structures.map((s) => (
                <li key={s.id} className="flex justify-between py-2.5">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-xs text-gray-500">{s.currency}</span>
                </li>
              ))}
            </ul>
          )}
        </HrSectionCard>

        <HrSectionCard
          title="Compensations"
          actions={
            <Button size="sm" variant="outline" onClick={() => setCompOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Assign
            </Button>
          }
        >
          {loadingComp ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : compensations.length === 0 ? (
            <p className="text-sm text-gray-500">Assign basic salary to employees before calculating a pay run.</p>
          ) : (
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Basic</th>
                    <th className="px-3 py-2">From</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compensations.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2">{c.employee ? employeeDisplayName(c.employee) : `#${c.employee_id}`}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatMoney(c.basic_salary)}</td>
                      <td className="px-3 py-2 text-gray-600">{c.effective_from}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HrSectionCard>
      </div>

      <HrSectionCard title="Pay runs">
        {loadingRuns ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : payRuns.length === 0 ? (
          <HrEmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="No pay runs"
            description="Create a pay period, then calculate, approve, and post."
            action={
              <Button onClick={() => setRunOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> New pay run
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
                {payRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-indigo-50/40">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {run.period_start} → {run.period_end}
                    </td>
                    <td className="px-3 py-2"><PayRunStatusBadge status={run.status} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(run.total_gross)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(run.total_net)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={ROUTES.HR.PAY_RUN(run.id)} className="text-indigo-600 hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <Modal isOpen={structureOpen} onClose={() => setStructureOpen(false)} title="Salary structure">
        <form onSubmit={handleStructure} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input required value={structureName} onChange={(e) => setStructureName(e.target.value)} className={inputClass} />
          </label>
          <p className="text-xs text-gray-500">Currency defaults to UGX for Uganda-first payroll.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStructureOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createStructure.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={compOpen} onClose={() => setCompOpen(false)} title="Assign compensation" size="lg">
        <form onSubmit={handleComp} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Employee</span>
            <select required value={compForm.employee_id} onChange={(e) => setCompForm((f) => ({ ...f, employee_id: e.target.value }))} className={inputClass}>
              <option value="">Select…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Structure</span>
            <select value={compForm.structure_id} onChange={(e) => setCompForm((f) => ({ ...f, structure_id: e.target.value }))} className={inputClass}>
              <option value="">None</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Basic salary (UGX)</span>
              <input
                type="number"
                min={0}
                required
                value={compForm.basic_salary}
                onChange={(e) => setCompForm((f) => ({ ...f, basic_salary: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Effective from</span>
              <input
                type="date"
                required
                value={compForm.effective_from}
                onChange={(e) => setCompForm((f) => ({ ...f, effective_from: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCompOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createComp.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={runOpen} onClose={() => setRunOpen(false)} title="New pay run">
        <form onSubmit={handleRun} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Period start</span>
            <input type="date" required value={runForm.period_start} onChange={(e) => setRunForm((f) => ({ ...f, period_start: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Period end</span>
            <input type="date" required value={runForm.period_end} onChange={(e) => setRunForm((f) => ({ ...f, period_end: e.target.value }))} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createRun.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
