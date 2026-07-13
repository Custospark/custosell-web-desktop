import { useMemo, useState, type FormEvent } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Hash,
  KeyRound,
  Mail,
  Phone,
  User,
  UserPlus,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { buildStaffModulesPayload } from '../../../shared/utils/moduleAccess';
import {
  useCreateHrEmployee,
  useCreateHrEmployeeWithAccount,
  useHrAccountOptions,
  useHrDepartments,
  useHrPositions,
} from '../api/useHrQueries';
import type { CreateEmployeePayload, EmploymentType } from '../api/hrTypes';
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

interface HrAddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
}

export function HrAddEmployeeModal({ open, onClose }: HrAddEmployeeModalProps) {
  const [createLogin, setCreateLogin] = useState(false);
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm);
  const [loginForm, setLoginForm] = useState<HrAppLoginFormState>(emptyAppLoginForm);

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
    setCreateLogin(false);
    setForm(emptyForm);
    setLoginForm(emptyAppLoginForm());
    onClose();
  }

  async function handleCreate(e: FormEvent) {
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
        modules: buildStaffModulesPayload(loginForm.modules, false, loginForm.hrFullAccess),
      });
    } else {
      await createEmployee.mutateAsync(base);
    }
    resetAndClose();
  }

  return (
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
          <HrFormSection title="Contact" icon={Mail} description="Optional for HR-only profiles. Email can’t be changed later from HR edit.">
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
          <HrAppLoginFields value={loginForm} onChange={setLoginForm} roles={roles} />
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
  );
}
