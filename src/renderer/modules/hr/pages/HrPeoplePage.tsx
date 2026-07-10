import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useCreateHrEmployee, useHrDepartments, useHrEmployees, useHrPositions } from '../api/useHrQueries';
import type { CreateEmployeePayload, EmploymentType } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const employmentOptions: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
];

const emptyForm: CreateEmployeePayload = {
  employee_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department_id: null,
  position_id: null,
  employment_type: 'full_time',
  status: 'onboarding',
  hire_date: new Date().toISOString().slice(0, 10),
};

export default function HrPeoplePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm);

  const { data: employees = [], isLoading } = useHrEmployees({
    q: search.trim() || undefined,
    status: statusFilter || undefined,
  });
  const { data: departments = [] } = useHrDepartments();
  const { data: positions = [] } = useHrPositions(form.department_id);
  const createEmployee = useCreateHrEmployee();

  const filteredPositions = useMemo(() => {
    if (!form.department_id) return positions;
    return positions.filter((p) => p.department_id === form.department_id || !p.department_id);
  }, [positions, form.department_id]);

  function resetAndClose() {
    setOpen(false);
    setForm(emptyForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createEmployee.mutateAsync({
      ...form,
      email: form.email || null,
      phone: form.phone || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
    });
    resetAndClose();
  }

  return (
    <div className="space-y-4">
      <HrPageHeader
        title="People"
        description="Employee directory — create profiles, then link staff login accounts when ready."
        actions={
          <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, number, email…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="onboarding">Onboarding</option>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : employees.length === 0 ? (
        <HrEmptyState
          icon={<Users className="h-6 w-6" />}
          title={search || statusFilter ? 'No matching employees' : 'No employees yet'}
          description={
            search || statusFilter
              ? 'Try a different search or clear filters.'
              : 'Add your first employee to start attendance, leave, and payroll.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add employee
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={HR_SURFACE.tableWrap}>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3">
                    <Link
                      to={ROUTES.HR.EMPLOYEE(employee.id)}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      {employeeDisplayName(employee)}
                    </Link>
                    {employee.email ? (
                      <p className="text-xs text-gray-500">{employee.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{employee.employee_number}</td>
                  <td className="px-4 py-3 text-gray-600">{employee.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{employee.position?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={open} onClose={resetAndClose} title="Add employee" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Employee number</span>
              <input
                required
                value={form.employee_number}
                onChange={(e) => setForm((f) => ({ ...f, employee_number: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Employment type</span>
              <select
                value={form.employment_type}
                onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {employmentOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">First name</span>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Last name</span>
              <input
                required
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Phone</span>
              <input
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Department</span>
              <select
                value={form.department_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    department_id: e.target.value ? Number(e.target.value) : null,
                    position_id: null,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Position</span>
              <select
                value={form.position_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position_id: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {filteredPositions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Hire date</span>
              <input
                type="date"
                value={form.hire_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" loading={createEmployee.isPending}>Create employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
