import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Link2, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import {
  useDeleteHrEmployee,
  useHrDepartments,
  useHrEmployee,
  useHrEmployees,
  useHrPositions,
  useLinkHrEmployeeUser,
  useUpdateHrEmployee,
} from '../api/useHrQueries';
import type { EmployeeStatus, EmploymentType, HrEmployee, UpdateEmployeePayload } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrPageHeader, HrSectionCard } from '../ui/HrSurface';

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function toForm(employee: HrEmployee): UpdateEmployeePayload {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    employee_number: employee.employee_number,
    department_id: employee.department_id ?? null,
    position_id: employee.position_id ?? null,
    manager_employee_id: employee.manager_employee_id ?? null,
    employment_type: employee.employment_type,
    status: employee.status,
    hire_date: employee.hire_date ?? '',
    termination_date: employee.termination_date ?? '',
    notes: employee.notes ?? '',
  };
}

export default function HrEmployeeDetailPage() {
  const { employeeId } = useParams();
  const id = Number(employeeId);
  const { data: employee, isLoading, isError } = useHrEmployee(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="space-y-4">
        <Link to={ROUTES.HR.PEOPLE} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to people
        </Link>
        <p className="text-sm text-gray-500">Employee not found or could not be loaded.</p>
      </div>
    );
  }

  return <EmployeeDetailEditor key={employee.id} employee={employee} />;
}

function EmployeeDetailEditor({ employee }: { employee: HrEmployee }) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const id = employee.id;

  const [form, setForm] = useState<UpdateEmployeePayload>(() => toForm(employee));
  const [linkUserId, setLinkUserId] = useState(employee.user_id ? String(employee.user_id) : '');

  const { data: departments = [] } = useHrDepartments();
  const { data: positions = [] } = useHrPositions(form.department_id);
  const { data: managers = [] } = useHrEmployees();
  const { data: staff = [] } = useStaff();
  const updateEmployee = useUpdateHrEmployee();
  const deleteEmployee = useDeleteHrEmployee();
  const linkUser = useLinkHrEmployeeUser();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    await updateEmployee.mutateAsync({
      id,
      ...form,
      email: form.email || null,
      phone: form.phone || null,
      hire_date: form.hire_date || null,
      termination_date: form.termination_date || null,
      notes: form.notes || null,
    });
  }

  async function handleLink() {
    await linkUser.mutateAsync({
      id,
      user_id: linkUserId ? Number(linkUserId) : null,
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete employee?',
      message: `Remove ${employeeDisplayName(employee)} from HR? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteEmployee.mutateAsync(id);
    navigate(ROUTES.HR.PEOPLE);
  }

  const managerOptions = managers.filter((m) => m.id !== id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={ROUTES.HR.PEOPLE} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> People
        </Link>
      </div>

      <HrPageHeader
        title={employeeDisplayName(employee)}
        description={`#${employee.employee_number}`}
        actions={
          <div className="flex items-center gap-2">
            <EmployeeStatusBadge status={employee.status} />
            <Button variant="danger" size="sm" onClick={handleDelete} className="inline-flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSave} className="space-y-4">
        <HrSectionCard title="Profile" description="Core employment details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input
                required
                value={form.first_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Last name">
              <input
                required
                value={form.last_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Employee number">
              <input
                required
                value={form.employee_number ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, employee_number: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status ?? 'active'}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EmployeeStatus }))}
                className={fieldClass}
              >
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Department">
              <select
                value={form.department_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    department_id: e.target.value ? Number(e.target.value) : null,
                    position_id: null,
                  }))
                }
                className={fieldClass}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Position">
              <select
                value={form.position_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position_id: e.target.value ? Number(e.target.value) : null }))
                }
                className={fieldClass}
              >
                <option value="">None</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Manager">
              <select
                value={form.manager_employee_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    manager_employee_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className={fieldClass}
              >
                <option value="">None</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{employeeDisplayName(m)}</option>
                ))}
              </select>
            </Field>
            <Field label="Employment type">
              <select
                value={form.employment_type ?? 'full_time'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))
                }
                className={fieldClass}
              >
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
              </select>
            </Field>
            <Field label="Hire date">
              <input
                type="date"
                value={form.hire_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <Field label="Termination date">
              <input
                type="date"
                value={form.termination_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, termination_date: e.target.value }))}
                className={fieldClass}
              />
            </Field>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">Notes</span>
              <textarea
                rows={3}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" loading={updateEmployee.isPending}>Save profile</Button>
          </div>
        </HrSectionCard>
      </form>

      <HrSectionCard
        title="Link staff user"
        description="Connect this HR profile to a Settings → Staff login account (optional)."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={handleLink}
            loading={linkUser.isPending}
            className="inline-flex items-center gap-1.5"
          >
            <Link2 className="h-3.5 w-3.5" />
            {linkUserId ? 'Save link' : 'Unlink'}
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[240px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700">Staff user</span>
            <select
              value={linkUserId}
              onChange={(e) => setLinkUserId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Not linked</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          {employee.user ? (
            <p className="text-sm text-gray-600">
              Currently linked to <span className="font-medium">{employee.user.name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500">No staff login linked yet.</p>
          )}
        </div>
      </HrSectionCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
