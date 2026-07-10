import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Calendar,
  Hash,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import {
  useCreateHrEmployee,
  useCreateHrEmployeeWithAccount,
  useHrAccountOptions,
  useHrDepartments,
  useHrEmployees,
  useHrPositions,
} from '../api/useHrQueries';
import type { CreateEmployeePayload, EmploymentType } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { emptyAppLoginForm, HrAppLoginFields, type HrAppLoginFormState } from '../ui/HrAppLoginFields';
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
  const [createLogin, setCreateLogin] = useState(false);
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm);
  const [loginForm, setLoginForm] = useState<HrAppLoginFormState>(emptyAppLoginForm);

  const { data: employees = [], isLoading } = useHrEmployees({
    q: search.trim() || undefined,
    status: statusFilter || undefined,
  });
  const { data: departments = [] } = useHrDepartments();
  const { data: positions = [] } = useHrPositions(form.department_id);
  const { data: accountOptions } = useHrAccountOptions(open);
  const createEmployee = useCreateHrEmployee();
  const createWithAccount = useCreateHrEmployeeWithAccount();

  const filteredPositions = useMemo(() => {
    if (!form.department_id) return positions;
    return positions.filter((p) => p.department_id === form.department_id || !p.department_id);
  }, [positions, form.department_id]);

  const roles = accountOptions?.roles ?? [];
  const saving = createEmployee.isPending || createWithAccount.isPending;

  function resetAndClose() {
    setOpen(false);
    setCreateLogin(false);
    setForm(emptyForm);
    setLoginForm(emptyAppLoginForm());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const base = {
      ...form,
      email: (createLogin ? loginForm.email : form.email) || null,
      phone: form.phone || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
    };

    if (createLogin) {
      if (loginForm.password !== loginForm.password_confirmation) return;
      await createWithAccount.mutateAsync({
        ...base,
        email: loginForm.email.trim(),
        password: loginForm.password,
        password_confirmation: loginForm.password_confirmation,
        role_id: loginForm.role_id ? Number(loginForm.role_id) : null,
        modules: loginForm.modules,
      });
    } else {
      await createEmployee.mutateAsync(base);
    }
    resetAndClose();
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Users}
        title="People"
        description="Everyone with a staff login appears here automatically. Add HR-only profiles anytime, or create a login when they need to sign in."
        actions={
          <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        }
      />

      <div className={HR_SURFACE.toolbar}>
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, number, or email…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
          title={search || statusFilter ? 'No one matches that search' : 'Your people list is empty'}
          description={
            search || statusFilter
              ? 'Try another name, clear the status filter, or check spelling.'
              : 'Staff added in Settings appear here after sync. Or add your first employee now.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add your first employee
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
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="transition-colors hover:bg-indigo-50/40">
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
                  <td className="px-4 py-3">
                    {employee.user_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <KeyRound className="h-3 w-3" />
                        Has login
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        No login
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={resetAndClose}
        title="Add employee"
        subtitle="Create their HR profile. Optionally give them an app login with a password you set."
        size="lg"
      >
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-5">
          <HrModalHero
            icon={UserPlus}
            title="New team member"
            description="Staff already in Settings are mirrored here automatically. Use this when you’re adding someone new to HR."
            tone="indigo"
          />

          <HrFormSection title="Identity" icon={User} description="How they show up across leave, attendance, and pay.">
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="First name" icon={User} required>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="Jane"
                  className={hrInputClass}
                  autoFocus
                />
              </HrIconField>
              <HrIconField label="Last name" icon={User} required>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Okello"
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Employee number" icon={Hash} required hint="Unique within your business.">
                <input
                  required
                  value={form.employee_number}
                  onChange={(e) => setForm((f) => ({ ...f, employee_number: e.target.value }))}
                  placeholder="EMP-001"
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Employment type" icon={Briefcase} required>
                <select
                  value={form.employment_type}
                  onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))}
                  className={hrSelectClass}
                >
                  {employmentOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </HrIconField>
            </div>
          </HrFormSection>

          {!createLogin ? (
            <HrFormSection title="Contact" icon={Mail} description="Optional for HR-only profiles.">
              <div className="grid gap-4 sm:grid-cols-2">
                <HrIconField label="Email" icon={Mail}>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={hrInputClass}
                  />
                </HrIconField>
                <HrIconField label="Phone" icon={Phone}>
                  <input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={hrInputClass}
                  />
                </HrIconField>
              </div>
            </HrFormSection>
          ) : (
            <HrFormSection title="Contact phone" icon={Phone} description="Login email is set in the App login section below.">
              <HrIconField label="Phone" icon={Phone}>
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </HrFormSection>
          )}

          <HrFormSection title="Role & start" icon={Building2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Department" icon={Building2}>
                <select
                  value={form.department_id ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      department_id: e.target.value ? Number(e.target.value) : null,
                      position_id: null,
                    }))
                  }
                  className={hrSelectClass}
                >
                  <option value="">Not assigned yet</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </HrIconField>
              <HrIconField label="Position" icon={Briefcase}>
                <select
                  value={form.position_id ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, position_id: e.target.value ? Number(e.target.value) : null }))
                  }
                  className={hrSelectClass}
                >
                  <option value="">Not assigned yet</option>
                  {filteredPositions.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </HrIconField>
              <HrIconField label="Hire date" icon={Calendar}>
                <input
                  type="date"
                  value={form.hire_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>

          <HrFormSection
            title="Will they sign in?"
            icon={KeyRound}
            description="Admin or HR sets the password — same as Settings → Staff."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCreateLogin(false)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  !createLogin
                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                )}
              >
                <p className="text-sm font-semibold text-gray-900">No login yet</p>
                <p className="mt-0.5 text-xs text-gray-500">HR profile only — they won’t sign in until you add an account.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateLogin(true);
                  setLoginForm((f) => ({
                    ...f,
                    email: f.email || (form.email ?? ''),
                  }));
                }}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  createLogin
                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                )}
              >
                <p className="text-sm font-semibold text-gray-900">Create login now</p>
                <p className="mt-0.5 text-xs text-gray-500">Set email, password, role, and modules in one step.</p>
              </button>
            </div>
          </HrFormSection>

          {createLogin ? (
            <HrAppLoginFields
              value={loginForm}
              onChange={setLoginForm}
              roles={roles}
            />
          ) : null}

          {createLogin && loginForm.password && loginForm.password !== loginForm.password_confirmation ? (
            <p className="text-sm text-red-600">Password confirmation does not match.</p>
          ) : null}

          <HrModalFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button
              type="submit"
              loading={saving}
              disabled={
                createLogin
                && (
                  !loginForm.email.trim()
                  || loginForm.password.length < 6
                  || loginForm.password !== loginForm.password_confirmation
                )
              }
            >
              {createLogin ? 'Create employee & login' : 'Create employee'}
            </Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
