import { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  Hash,
  MessageSquare,
  Pencil,
  Plus,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  useApproveHrLeaveRequest,
  useCancelHrLeaveRequest,
  useCreateHrLeaveRequest,
  useCreateHrLeaveType,
  useDeleteHrLeaveType,
  useHrEmployees,
  useHrLeaveBalances,
  useHrLeaveRequests,
  useHrLeaveTypes,
  useRejectHrLeaveRequest,
  useUpdateHrLeaveType,
} from '../api/useHrQueries';
import { employeeDisplayName, type HrLeaveType } from '../api/hrTypes';
import { LeaveStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';

const emptyTypeForm = {
  name: '',
  code: '',
  days_per_year: 21,
  paid: true,
  requires_approval: true,
};

export default function HrLeavePage() {
  const { confirm } = useConfirm();
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);
  const year = new Date().getFullYear();
  const { data: leaveTypes = [], isLoading: loadingTypes } = useHrLeaveTypes();
  const { data: balances = [], isLoading: loadingBalances } = useHrLeaveBalances({ year });
  const { data: requests = [], isLoading: loadingRequests } = useHrLeaveRequests();
  const { data: employees = [] } = useHrEmployees();
  const createType = useCreateHrLeaveType();
  const updateType = useUpdateHrLeaveType();
  const deleteType = useDeleteHrLeaveType();
  const createRequest = useCreateHrLeaveRequest();
  const approve = useApproveHrLeaveRequest();
  const reject = useRejectHrLeaveRequest();
  const cancelRequest = useCancelHrLeaveRequest();

  const selfEmployee = employees.find((e) => e.user_id != null && user?.id != null && e.user_id === user.id) ?? null;

  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<HrLeaveType | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [reqForm, setReqForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  function openCreateType() {
    setEditingType(null);
    setTypeForm(emptyTypeForm);
    setTypeOpen(true);
  }

  function openEditType(t: HrLeaveType) {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      code: t.code,
      days_per_year: t.days_per_year,
      paid: t.paid,
      requires_approval: t.requires_approval,
    });
    setTypeOpen(true);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault();
    if (!isFullHr) return;
    if (editingType) {
      await updateType.mutateAsync({ id: editingType.id, ...typeForm });
    } else {
      await createType.mutateAsync(typeForm);
    }
    setTypeOpen(false);
    setEditingType(null);
    setTypeForm(emptyTypeForm);
  }

  async function handleDeleteType(t: HrLeaveType) {
    const ok = await confirm({
      title: 'Delete leave type?',
      message: `Remove “${t.name}”? Existing balances and requests that used it may need review.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteType.mutateAsync(t.id);
  }

  async function handleCancelRequest(id: number, label: string) {
    const ok = await confirm({
      title: 'Cancel leave request?',
      message: `Cancel ${label}? Days held as pending or used will be returned to the balance.`,
      confirmText: 'Cancel leave',
      variant: 'danger',
    });
    if (ok) await cancelRequest.mutateAsync(id);
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    const employeeId = isFullHr ? Number(reqForm.employee_id) : selfEmployee?.id;
    if (!employeeId) return;
    await createRequest.mutateAsync({
      employee_id: employeeId,
      leave_type_id: Number(reqForm.leave_type_id),
      start_date: reqForm.start_date,
      end_date: reqForm.end_date,
      reason: reqForm.reason || null,
    });
    setReqOpen(false);
    setReqForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
  }

  const visibleRequests = isFullHr || !selfEmployee
    ? requests
    : requests.filter((r) => r.employee_id === selfEmployee.id);
  const visibleBalances = isFullHr || !selfEmployee
    ? balances
    : balances.filter((b) => b.employee_id === selfEmployee.id);

  function canCancelRequest(employeeId: number, status: string) {
    if (!['pending', 'approved'].includes(status)) return false;
    if (isFullHr) return true;
    return selfEmployee != null && selfEmployee.id === employeeId;
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={CalendarDays}
        title="Leave"
        description={
          isFullHr
            ? 'Set up leave types, track balances, and approve time off — so your team knows where they stand.'
            : 'Request time off and track your balances. Approvals are handled by HR.'
        }
        actions={
          <>
            {isFullHr ? (
              <Button variant="outline" size="sm" onClick={openCreateType} className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Leave type
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={() => {
                if (!isFullHr && selfEmployee) {
                  setReqForm((f) => ({ ...f, employee_id: String(selfEmployee.id) }));
                }
                setReqOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
              disabled={!isFullHr && !selfEmployee}
            >
              <Plus className="h-3.5 w-3.5" /> Request leave
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard title="Leave types" description="Annual, sick, unpaid — whatever your policy allows.">
          {loadingTypes ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : leaveTypes.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none"
              icon={<CalendarDays className="h-5 w-5" />}
              title="No leave types yet"
              description="Add Annual, Sick, or Unpaid leave so balances and requests have something to attach to."
              action={
                isFullHr ? (
                  <Button size="sm" variant="outline" onClick={openCreateType} className="inline-flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add leave type
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {leaveTypes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-gray-900">
                      {t.name}{' '}
                      <span className="font-mono text-xs text-gray-400">({t.code})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.days_per_year} days/year · {t.paid ? 'Paid' : 'Unpaid'}
                      {t.requires_approval ? ' · Approval required' : ''}
                    </p>
                  </div>
                  {isFullHr ? (
                    <div className="inline-flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditType(t)}
                        className="inline-flex items-center gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deleteType.isPending}
                        onClick={() => void handleDeleteType(t)}
                        className="inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </HrSectionCard>

        <HrSectionCard
          title={`Balances (${year})`}
          description={isFullHr ? 'Used, pending, and entitled days per person.' : 'Your leave balances for this year.'}
        >
          {loadingBalances ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : visibleBalances.length === 0 ? (
            <p className="text-sm text-gray-500">
              Balances appear once leave types exist and people start requesting time off.
            </p>
          ) : (
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Used</th>
                    <th className="px-3 py-2">Pending</th>
                    <th className="px-3 py-2">Entitled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleBalances.map((b) => (
                    <tr key={b.id}>
                      <td className="px-3 py-2">{b.employee ? employeeDisplayName(b.employee) : `#${b.employee_id}`}</td>
                      <td className="px-3 py-2">{b.leave_type?.name ?? b.leave_type_id}</td>
                      <td className="px-3 py-2">{b.used}</td>
                      <td className="px-3 py-2">{b.pending}</td>
                      <td className="px-3 py-2">{b.entitled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HrSectionCard>
      </div>

      <HrSectionCard
        title="Requests"
        description={isFullHr ? 'Pending requests need your approval — approved days sync to attendance.' : 'Your leave requests and their status.'}
      >
        {loadingRequests ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : visibleRequests.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<Calendar className="h-5 w-5" />}
            title="No leave requests yet"
            description={isFullHr ? 'When someone needs time off, submit a request here for approval.' : 'Submit a request when you need time off.'}
            action={
              <Button
                size="sm"
                onClick={() => setReqOpen(true)}
                className="inline-flex items-center gap-1.5"
                disabled={!isFullHr && !selfEmployee}
              >
                <Plus className="h-3.5 w-3.5" /> Submit a request
              </Button>
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRequests.map((r) => {
                  const label = r.employee
                    ? `${employeeDisplayName(r.employee)} · ${formatShiftDateRange(r.start_date, r.end_date)}`
                    : formatShiftDateRange(r.start_date, r.end_date);
                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.employee ? employeeDisplayName(r.employee) : `#${r.employee_id}`}</td>
                      <td className="px-3 py-2">{r.leave_type?.name ?? r.leave_type_id}</td>
                      <td className="px-3 py-2 text-gray-600">{formatShiftDateRange(r.start_date, r.end_date)}</td>
                      <td className="px-3 py-2">{r.days}</td>
                      <td className="px-3 py-2"><LeaveStatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          {isFullHr && r.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={approve.isPending}
                                onClick={() => approve.mutate({ id: r.id })}
                                className="inline-flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={reject.isPending}
                                onClick={() => reject.mutate({ id: r.id })}
                                className="inline-flex items-center gap-1"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          ) : null}
                          {canCancelRequest(r.employee_id, r.status) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              loading={cancelRequest.isPending}
                              onClick={() => void handleCancelRequest(r.id, label)}
                              className="inline-flex items-center gap-1"
                            >
                              Cancel
                            </Button>
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
        isOpen={typeOpen && isFullHr}
        onClose={() => {
          setTypeOpen(false);
          setEditingType(null);
        }}
        title={editingType ? 'Edit leave type' : 'Add leave type'}
        subtitle={editingType ? 'Update how this kind of time off works.' : 'Define how this kind of time off works for your business.'}
      >
        <form onSubmit={handleSaveType} className="space-y-5">
          <HrModalHero
            icon={Tag}
            title={editingType ? 'Edit leave type' : 'New leave type'}
            description="Annual, sick, maternity — set the rules once and they apply to everyone."
            tone="emerald"
          />
          <HrFormSection title="Policy" icon={CalendarDays} description="Name and code appear on requests and balances.">
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Name" icon={Tag} required>
                <input
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Annual leave"
                  className={hrInputClass}
                  autoFocus
                />
              </HrIconField>
              <HrIconField label="Code" icon={Hash} required hint="Short code, e.g. ANNUAL">
                <input
                  required
                  value={typeForm.code}
                  onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
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
                value={typeForm.days_per_year}
                onChange={(e) => setTypeForm((f) => ({ ...f, days_per_year: Number(e.target.value) }))}
                className={hrInputClass}
              />
            </HrIconField>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={typeForm.paid} onChange={(e) => setTypeForm((f) => ({ ...f, paid: e.target.checked }))} />
                Paid leave
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={typeForm.requires_approval}
                  onChange={(e) => setTypeForm((f) => ({ ...f, requires_approval: e.target.checked }))}
                />
                Requires manager approval
              </label>
            </div>
          </HrFormSection>
          <HrModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTypeOpen(false);
                setEditingType(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createType.isPending || updateType.isPending}>
              {editingType ? 'Save changes' : 'Create leave type'}
            </Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={reqOpen}
        onClose={() => setReqOpen(false)}
        title="Request leave"
        subtitle="Submit time off on behalf of an employee."
        size="lg"
      >
        <form onSubmit={handleCreateRequest} className="space-y-5">
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
                  value={reqForm.employee_id}
                  onChange={(e) => setReqForm((f) => ({ ...f, employee_id: e.target.value }))}
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
                value={reqForm.leave_type_id}
                onChange={(e) => setReqForm((f) => ({ ...f, leave_type_id: e.target.value }))}
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
                  value={reqForm.start_date}
                  onChange={(e) => setReqForm((f) => ({ ...f, start_date: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="End date" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={reqForm.end_date}
                  onChange={(e) => setReqForm((f) => ({ ...f, end_date: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>
          <HrFormSection title="Context" icon={MessageSquare} description="Optional — helpful when reviewing the request.">
            <HrIconField label="Reason" icon={MessageSquare}>
              <textarea
                value={reqForm.reason}
                onChange={(e) => setReqForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                placeholder="Family event, medical appointment, etc."
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createRequest.isPending}>Submit request</Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
