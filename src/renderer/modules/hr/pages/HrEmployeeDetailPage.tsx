import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Hash,
  KeyRound,
  Link2,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  User,
  UserCircle,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { buildStaffModulesPayload } from '../../../shared/utils/moduleAccess';
import {
  useCreateHrEmployeeAccount,
  useDeleteHrEmployee,
  useHrAccountOptions,
  useHrDepartments,
  useHrEmployee,
  useHrEmployees,
  useHrPositions,
  useLinkHrEmployeeUser,
  useRemoveHrEmployeeAccount,
  useUnlinkHrEmployeeUser,
  useUpdateHrEmployee,
} from '../api/useHrQueries';
import type { EmployeeStatus, EmploymentType, HrEmployee, UpdateEmployeePayload } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { emptyAppLoginForm, type HrAppLoginFormState } from '../ui/hrAppLoginForm';
import { HrAppLoginFields } from '../ui/HrAppLoginFields';
import { HrEmployeePerformanceCard } from '../ui/HrWorkPerformancePanel';
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
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);
  const id = employee.id;

  const [form, setForm] = useState<UpdateEmployeePayload>(() => toForm(employee));
  const [linkUserId, setLinkUserId] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginForm, setLoginForm] = useState<HrAppLoginFormState>(() => ({
    ...emptyAppLoginForm(),
    email: employee.email ?? '',
  }));

  const { data: departments = [] } = useHrDepartments();
  const { data: positions = [] } = useHrPositions(form.department_id);
  const { data: managers = [] } = useHrEmployees();
  const { data: accountOptions } = useHrAccountOptions(true);
  const updateEmployee = useUpdateHrEmployee();
  const deleteEmployee = useDeleteHrEmployee();
  const linkUser = useLinkHrEmployeeUser();
  const unlinkUser = useUnlinkHrEmployeeUser();
  const createAccount = useCreateHrEmployeeAccount();
  const removeAccount = useRemoveHrEmployeeAccount();

  const unlinkedUsers = accountOptions?.unlinked_users ?? [];
  const roles = accountOptions?.roles ?? [];
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

  async function handleLink() {
    if (!linkUserId) return;
    await linkUser.mutateAsync({ id, user_id: Number(linkUserId) });
    setLinkUserId('');
  }

  async function handleUnlink() {
    const ok = await confirm({
      title: 'Disconnect login?',
      message: 'Their staff account stays in Settings — only the link to this HR profile is removed.',
      confirmText: 'Disconnect',
      variant: 'warning',
    });
    if (ok) await unlinkUser.mutateAsync(id);
  }

  async function handleRemoveAccount() {
    const ok = await confirm({
      title: 'Remove app login?',
      message: `Delete the login for ${employee.user?.name ?? employeeDisplayName(employee)}? They will no longer be able to sign in. Their HR profile stays.`,
      confirmText: 'Remove login',
      variant: 'danger',
    });
    if (ok) await removeAccount.mutateAsync(id);
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (loginForm.password !== loginForm.password_confirmation) return;
    await createAccount.mutateAsync({
      id,
      email: loginForm.email.trim(),
      password: loginForm.password,
      password_confirmation: loginForm.password_confirmation,
      role_id: loginForm.role_id ? Number(loginForm.role_id) : null,
      modules: buildStaffModulesPayload(loginForm.modules, false, loginForm.hrFullAccess),
      phone: form.phone || null,
      account_name: `${form.first_name ?? ''} ${form.last_name ?? ''}`.trim(),
    });
    setAccountOpen(false);
    setLoginForm({ ...emptyAppLoginForm(), email: loginForm.email });
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
          title: 'Also remove app login?',
          message: 'Delete their staff login so they can no longer sign in? Choose Cancel to keep the login (HR profile only is removed).',
          confirmText: 'Remove login too',
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

      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <HrFormSection title="Identity" icon={User} description="How they appear across HR — name, number, and status.">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="First name" icon={User} required>
              <input
                required
                value={form.first_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Last name" icon={User} required>
              <input
                required
                value={form.last_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Employee number" icon={Hash} required>
              <input
                required
                value={form.employee_number ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, employee_number: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Status" icon={UserCircle} required>
              <select
                value={form.status ?? 'active'}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EmployeeStatus }))}
                className={hrSelectClass}
              >
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

        <HrFormSection title="Role" icon={Building2} description="Where they sit in the org chart.">
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
                <option value="">None</option>
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
                <option value="">None</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Manager" icon={Users}>
              <select
                value={form.manager_employee_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    manager_employee_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className={hrSelectClass}
              >
                <option value="">None</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{employeeDisplayName(m)}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Employment type" icon={Briefcase}>
              <select
                value={form.employment_type ?? 'full_time'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employment_type: e.target.value as EmploymentType }))
                }
                className={hrSelectClass}
              >
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
              <input
                type="date"
                value={form.hire_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Termination date" icon={Calendar}>
              <input
                type="date"
                value={form.termination_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, termination_date: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
          </div>
          <HrIconField label="Notes" icon={MessageSquare}>
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Internal notes — not shown on payslips"
              className={hrInputClass}
            />
          </HrIconField>
        </HrFormSection>

        <div className="flex justify-end">
          <Button type="submit" loading={updateEmployee.isPending}>Save profile</Button>
        </div>
      </form>

      <HrSectionCard
        title="App login"
        description="Admin or HR owns account creation and removal. Password is set by you — share it securely."
        actions={
          hasLogin ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleUnlink()}
                loading={unlinkUser.isPending}
              >
                Disconnect only
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void handleRemoveAccount()}
                loading={removeAccount.isPending}
                className="inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Remove login
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setLoginForm({ ...emptyAppLoginForm(), email: form.email ?? employee.email ?? '' });
                setAccountOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Create app login
            </Button>
          )
        }
      >
        {hasLogin && employee.user ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">{employee.user.name}</p>
            <p className="mt-0.5 text-xs opacity-80">{employee.user.email}</p>
            <p className="mt-2 text-xs text-emerald-800/80">
              Disconnect keeps the Settings account. Remove login deletes the account so they cannot sign in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              No app login yet. Create one with a password, or link an existing staff account that isn’t already tied to someone else.
            </p>
            {unlinkedUsers.length > 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <HrIconField label="Link existing staff" icon={Link2}>
                    <select
                      value={linkUserId}
                      onChange={(e) => setLinkUserId(e.target.value)}
                      className={hrSelectClass}
                    >
                      <option value="">Select staff…</option>
                      {unlinkedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </HrIconField>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!linkUserId}
                  loading={linkUser.isPending}
                  onClick={() => void handleLink()}
                  className="inline-flex items-center gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">All staff accounts are already linked to an HR profile.</p>
            )}
          </div>
        )}
      </HrSectionCard>

      <Modal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="Create app login"
        subtitle="You set the password — same pattern as Settings → Staff."
        size="lg"
      >
        <form onSubmit={(e) => void handleCreateAccount(e)} className="space-y-5">
          <HrModalHero
            icon={KeyRound}
            title="Give them access"
            description={`Create a login for ${employeeDisplayName(employee)}. Share the password securely — they can change it later.`}
            tone="indigo"
          />
          <HrAppLoginFields value={loginForm} onChange={setLoginForm} roles={roles} />
          {loginForm.password && loginForm.password !== loginForm.password_confirmation ? (
            <p className="text-sm text-red-600">Password confirmation does not match.</p>
          ) : null}
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              loading={createAccount.isPending}
              disabled={
                !loginForm.email.trim()
                || loginForm.password.length < 6
                || loginForm.password !== loginForm.password_confirmation
              }
            >
              Create login
            </Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
