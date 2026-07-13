import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Hash,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  User,
  UserCircle,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useDeleteHrEmployee,
  useHrDepartments,
  useHrEmployees,
  useHrPositions,
  useUpdateHrEmployee,
} from '../api/useHrQueries';
import type { EmployeeStatus, EmploymentType, HrEmployee, UpdateEmployeePayload } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrPageHeader } from '../ui/HrSurface';
import { HrFormSection, HrIconField, hrInputClass, hrSelectClass } from '../ui/hrFormFields';
import { HrEmployeePerformanceCard } from '../ui/HrWorkPerformancePanel';
import { HrEmployeeAssetsPanel } from '../ui/HrEmployeeAssetsPanel';
import { HrEmployeeLoginSection } from '../ui/HrEmployeeLoginSection';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';

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

export function HrEmployeeDetailEditor({ employee }: { employee: HrEmployee }) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);
  const id = employee.id;
  const [form, setForm] = useState<UpdateEmployeePayload>(() => toForm(employee));

  const { data: departments = [] } = useHrDepartments();
  const { data: positions = [] } = useHrPositions(form.department_id);
  const { data: managers = [] } = useHrEmployees();
  const updateEmployee = useUpdateHrEmployee();
  const deleteEmployee = useDeleteHrEmployee();
  const managerOptions = managers.filter((m) => m.id !== id);
  const hasLogin = Boolean(employee.user_id);

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

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete employee?',
      message: `Remove ${employeeDisplayName(employee)} from HR? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    let alsoRemoveAccount = false;
    if (hasLogin) {
      alsoRemoveAccount = Boolean(
        await confirm({
          title: 'Also detach from organization?',
          message:
            'Detach their login from this business too? Their account stays — they just lose access here. Choose Keep login to delete the HR profile only (they stay on the organization).',
          confirmText: 'Detach from organization',
          cancelText: 'Keep login',
          variant: 'warning',
        }),
      );
    }

    await deleteEmployee.mutateAsync({ id, remove_account: alsoRemoveAccount });
    navigate(ROUTES.HR.PEOPLE);
  }

  return (
    <div className="space-y-5">
      <Link to={ROUTES.HR.PEOPLE} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to people
      </Link>

      <HrPageHeader
        icon={UserCircle}
        title={employeeDisplayName(employee)}
        description={`Employee #${employee.employee_number} — update their profile anytime; changes apply across leave, attendance, and pay.`}
        actions={
          <div className="flex items-center gap-2">
            <EmployeeStatusBadge status={employee.status} />
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} className="inline-flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      {employee.user_id ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-br from-violet-50/90 via-white/90 to-blue-50/80 p-4 shadow-md backdrop-blur-md sm:p-5">
          <div className="mb-4 border-b border-white/50 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Work performance</h2>
            <p className="mt-0.5 text-xs text-slate-600">Goals and delivery from Pipeline cards/leads and Project tasks — Progress-style pulse.</p>
          </div>
          <HrEmployeePerformanceCard employeeId={employee.id} isFullHr={isFullHr} />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/55 bg-white/85 p-4 shadow-sm backdrop-blur-md sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Work performance</h2>
          <p className="mt-1 text-sm text-slate-600">
            No staff login linked yet — assignees on boards and project tasks use the app account, so link one to unlock evaluation.
          </p>
        </div>
      )}

      <HrEmployeeAssetsPanel employeeId={employee.id} />

      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <HrFormSection title="Identity" icon={User} description="How they appear across HR — name, number, and status.">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="First name" icon={User} required>
              <input required value={form.first_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Last name" icon={User} required>
              <input required value={form.last_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Employee number" icon={Hash} required>
              <input required value={form.employee_number ?? ''} onChange={(e) => setForm((f) => ({ ...f, employee_number: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Status" icon={UserCircle} required>
              <select value={form.status ?? 'active'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EmployeeStatus }))} className={hrSelectClass}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </HrIconField>
          </div>
        </HrFormSection>

        <HrFormSection title="Contact" icon={Mail} description="Optional — helpful for payslips and leave notices.">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="Email" icon={Mail}>
              <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Phone" icon={Phone}>
              <input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={hrInputClass} />
            </HrIconField>
          </div>
        </HrFormSection>

        <HrFormSection title="Role" icon={Building2} description="Where they sit in the org chart.">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="Department" icon={Building2}>
              <select
                value={form.department_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value ? Number(e.target.value) : null, position_id: null }))}
                className={hrSelectClass}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Position" icon={Briefcase}>
              <select value={form.position_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, position_id: e.target.value ? Number(e.target.value) : null }))} className={hrSelectClass}>
                <option value="">None</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Manager" icon={Users}>
              <select value={form.manager_employee_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, manager_employee_id: e.target.value ? Number(e.target.value) : null }))} className={hrSelectClass}>
                <option value="">None</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{employeeDisplayName(m)}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Employment type" icon={Briefcase}>
              <select value={form.employment_type ?? 'full_time'} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))} className={hrSelectClass}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
              </select>
            </HrIconField>
          </div>
        </HrFormSection>

        <HrFormSection title="Dates & notes" icon={Calendar}>
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="Hire date" icon={Calendar}>
              <input type="date" value={form.hire_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Termination date" icon={Calendar}>
              <input type="date" value={form.termination_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, termination_date: e.target.value }))} className={hrInputClass} />
            </HrIconField>
          </div>
          <HrIconField label="Notes" icon={MessageSquare}>
            <textarea rows={3} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal notes — not shown on payslips" className={hrInputClass} />
          </HrIconField>
        </HrFormSection>

        <div className="flex justify-end">
          <Button type="submit" loading={updateEmployee.isPending}>Save profile</Button>
        </div>
      </form>

      <HrEmployeeLoginSection
        employee={employee}
        formEmail={form.email}
        formPhone={form.phone}
        formFirstName={form.first_name}
        formLastName={form.last_name}
      />
    </div>
  );
}
