import { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  Hash,
  MessageSquare,
  Plus,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useApproveHrLeaveRequest,
  useCreateHrLeaveRequest,
  useCreateHrLeaveType,
  useHrEmployees,
  useHrLeaveBalances,
  useHrLeaveRequests,
  useHrLeaveTypes,
  useRejectHrLeaveRequest,
} from '../api/useHrQueries';
import { employeeDisplayName } from '../api/hrTypes';
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

export default function HrLeavePage() {
  const year = new Date().getFullYear();
  const { data: leaveTypes = [], isLoading: loadingTypes } = useHrLeaveTypes();
  const { data: balances = [], isLoading: loadingBalances } = useHrLeaveBalances({ year });
  const { data: requests = [], isLoading: loadingRequests } = useHrLeaveRequests();
  const { data: employees = [] } = useHrEmployees();
  const createType = useCreateHrLeaveType();
  const createRequest = useCreateHrLeaveRequest();
  const approve = useApproveHrLeaveRequest();
  const reject = useRejectHrLeaveRequest();

  const [typeOpen, setTypeOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', code: '', days_per_year: 21, paid: true, requires_approval: true });
  const [reqForm, setReqForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  async function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    await createType.mutateAsync(typeForm);
    setTypeOpen(false);
    setTypeForm({ name: '', code: '', days_per_year: 21, paid: true, requires_approval: true });
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    await createRequest.mutateAsync({
      employee_id: Number(reqForm.employee_id),
      leave_type_id: Number(reqForm.leave_type_id),
      start_date: reqForm.start_date,
      end_date: reqForm.end_date,
      reason: reqForm.reason || null,
    });
    setReqOpen(false);
    setReqForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={CalendarDays}
        title="Leave"
        description="Set up leave types, track balances, and approve time off — so your team knows where they stand."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTypeOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Leave type
            </Button>
            <Button size="sm" onClick={() => setReqOpen(true)} className="inline-flex items-center gap-1.5">
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
                <Button size="sm" variant="outline" onClick={() => setTypeOpen(true)} className="inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add leave type
                </Button>
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
                </li>
              ))}
            </ul>
          )}
        </HrSectionCard>

        <HrSectionCard title={`Balances (${year})`} description="Used, pending, and entitled days per person.">
          {loadingBalances ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-gray-500">
              Balances appear once leave types exist and people start requesting time off.
            </p>
          ) : (
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Used</th>
                    <th className="px-3 py-2">Pending</th>
                    <th className="px-3 py-2">Entitled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {balances.map((b) => (
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

      <HrSectionCard title="Requests" description="Pending requests need your approval — approved days sync to attendance.">
        {loadingRequests ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : requests.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<Calendar className="h-5 w-5" />}
            title="No leave requests yet"
            description="When someone needs time off, submit a request here — you can approve or reject in one click."
            action={
              <Button size="sm" onClick={() => setReqOpen(true)} className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Submit a request
              </Button>
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
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
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.employee ? employeeDisplayName(r.employee) : `#${r.employee_id}`}</td>
                    <td className="px-3 py-2">{r.leave_type?.name ?? r.leave_type_id}</td>
                    <td className="px-3 py-2 text-gray-600">{r.start_date} → {r.end_date}</td>
                    <td className="px-3 py-2">{r.days}</td>
                    <td className="px-3 py-2"><LeaveStatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 text-right">
                      {r.status === 'pending' ? (
                        <div className="inline-flex gap-1">
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
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <Modal
        isOpen={typeOpen}
        onClose={() => setTypeOpen(false)}
        title="Add leave type"
        subtitle="Define how this kind of time off works for your business."
      >
        <form onSubmit={handleCreateType} className="space-y-5">
          <HrModalHero
            icon={Tag}
            title="New leave type"
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
            <Button type="button" variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createType.isPending}>Create leave type</Button>
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
          <HrFormSection title="Who & when" icon={User} description="Pick the person, leave type, and date range.">
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
