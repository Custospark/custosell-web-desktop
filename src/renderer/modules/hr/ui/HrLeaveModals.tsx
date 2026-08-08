import { useState } from 'react';
import { Calendar, CalendarDays, Hash, MessageSquare, Tag, User, Users } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  useCreateHrLeaveRequest,
  useCreateHrLeaveType,
  useHrLeaveTypes,
  useUpdateHrLeaveType,
} from '../api/useHrQueries';
import { employeeDisplayName, type HrEmployeeRef, type HrLeaveType } from '../api/hrTypes';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from './hrFormFields';

export function HrLeaveTypeModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: HrLeaveType | null;
}) {
  const createType = useCreateHrLeaveType();
  const updateType = useUpdateHrLeaveType();
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    days_per_year: editing?.days_per_year ?? 21,
    paid: editing?.paid ?? true,
    requires_approval: editing?.requires_approval ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await updateType.mutateAsync({ id: editing.id, ...form });
    } else {
      await createType.mutateAsync(form);
    }
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit leave type' : 'Add leave type'}
      subtitle={editing ? 'Update how this kind of time off works.' : 'Define how this kind of time off works for your business.'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <HrModalHero
          icon={Tag}
          title={editing ? 'Edit leave type' : 'New leave type'}
          description="Annual, sick, maternity — set the rules once and they apply to everyone."
          tone="emerald"
        />
        <HrFormSection title="Policy" icon={CalendarDays} description="Name and code appear on requests and balances.">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="Name" icon={Tag} required>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Annual leave"
                className={hrInputClass}
                autoFocus
              />
            </HrIconField>
            <HrIconField label="Code" icon={Hash} required hint="Short code, e.g. ANNUAL">
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="ANNUAL"
                className={hrInputClass}
              />
            </HrIconField>
          </div>
          <HrIconField label="Days per year" icon={Calendar} required>
            <input
              type="number"
              min={0}
              required
              value={form.days_per_year}
              onChange={(e) => setForm((f) => ({ ...f, days_per_year: Number(e.target.value) }))}
              className={hrInputClass}
            />
          </HrIconField>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
              Paid leave
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.requires_approval}
                onChange={(e) => setForm((f) => ({ ...f, requires_approval: e.target.checked }))}
              />
              Requires manager approval
            </label>
          </div>
        </HrFormSection>
        <HrModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createType.isPending || updateType.isPending}>
            {editing ? 'Save changes' : 'Create leave type'}
          </Button>
        </HrModalFooter>
      </form>
    </Modal>
  );
}

export function HrLeaveRequestModal({
  open,
  onClose,
  isFullHr,
  selfEmployee,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  isFullHr: boolean;
  selfEmployee: HrEmployeeRef | null;
  employees: HrEmployeeRef[];
}) {
  const createRequest = useCreateHrLeaveRequest();
  const { data: leaveTypes = [] } = useHrLeaveTypes();
  const [form, setForm] = useState({
    employee_id: selfEmployee ? String(selfEmployee.id) : '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const employeeId = isFullHr ? Number(form.employee_id) : selfEmployee?.id;
    if (!employeeId) return;
    await createRequest.mutateAsync({
      employee_id: employeeId,
      leave_type_id: Number(form.leave_type_id),
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason || null,
    });
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Request leave"
      subtitle="Submit time off on behalf of an employee."
      size="lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <HrModalHero
          icon={CalendarDays}
          title="Time off request"
          description="We'll hold the days as pending until you approve — balances update automatically."
          tone="indigo"
        />
        <HrFormSection title="Who & when" icon={User} description={isFullHr ? 'Pick the person, leave type, and date range.' : 'Choose leave type and dates for your request.'}>
          {isFullHr ? (
            <HrIconField label="Employee" icon={Users} required>
              <select
                required
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">Select someone…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                ))}
              </select>
            </HrIconField>
          ) : (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Requesting as{' '}
              <span className="font-medium">
                {selfEmployee ? employeeDisplayName(selfEmployee) : 'your linked profile'}
              </span>
            </p>
          )}
          <HrIconField label="Leave type" icon={Tag} required>
            <select
              required
              value={form.leave_type_id}
              onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))}
              className={hrSelectClass}
            >
              <option value="">Select type…</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </HrIconField>
          <div className="grid gap-4 sm:grid-cols-2">
            <HrIconField label="Start date" icon={Calendar} required>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="End date" icon={Calendar} required>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
          </div>
        </HrFormSection>
        <HrFormSection title="Context" icon={MessageSquare} description="Optional — helpful when reviewing the request.">
          <HrIconField label="Reason" icon={MessageSquare}>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              placeholder="Family event, medical appointment, etc."
              className={hrInputClass}
            />
          </HrIconField>
        </HrFormSection>
        <HrModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createRequest.isPending}>Submit request</Button>
        </HrModalFooter>
      </form>
    </Modal>
  );
}
