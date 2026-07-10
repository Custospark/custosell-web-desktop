import { useState } from 'react';
import { CalendarDays, Check, Plus, X } from 'lucide-react';
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
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

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
    <div className="space-y-4">
      <HrPageHeader
        title="Leave"
        description="Configure leave types, track balances, and approve requests."
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
        <HrSectionCard title="Leave types">
          {loadingTypes ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : leaveTypes.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none"
              icon={<CalendarDays className="h-5 w-5" />}
              title="No leave types"
              description="Add Annual, Sick, or Unpaid leave types to get started."
            />
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {leaveTypes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium text-gray-900">{t.name} <span className="font-mono text-xs text-gray-400">({t.code})</span></p>
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

        <HrSectionCard title={`Balances (${year})`}>
          {loadingBalances ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-gray-500">No balances yet. They appear after leave types exist and employees request leave.</p>
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

      <HrSectionCard title="Requests">
        {loadingRequests ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : requests.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            title="No leave requests"
            description="Submit a request for an employee, then approve or reject from this list."
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

      <Modal isOpen={typeOpen} onClose={() => setTypeOpen(false)} title="Add leave type">
        <form onSubmit={handleCreateType} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input required value={typeForm.name} onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Code</span>
            <input required value={typeForm.code} onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Days per year</span>
            <input
              type="number"
              min={0}
              required
              value={typeForm.days_per_year}
              onChange={(e) => setTypeForm((f) => ({ ...f, days_per_year: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={typeForm.paid} onChange={(e) => setTypeForm((f) => ({ ...f, paid: e.target.checked }))} />
            Paid leave
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={typeForm.requires_approval} onChange={(e) => setTypeForm((f) => ({ ...f, requires_approval: e.target.checked }))} />
            Requires approval
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createType.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={reqOpen} onClose={() => setReqOpen(false)} title="Request leave" size="lg">
        <form onSubmit={handleCreateRequest} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Employee</span>
            <select required value={reqForm.employee_id} onChange={(e) => setReqForm((f) => ({ ...f, employee_id: e.target.value }))} className={inputClass}>
              <option value="">Select…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Leave type</span>
            <select required value={reqForm.leave_type_id} onChange={(e) => setReqForm((f) => ({ ...f, leave_type_id: e.target.value }))} className={inputClass}>
              <option value="">Select…</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Start</span>
              <input type="date" required value={reqForm.start_date} onChange={(e) => setReqForm((f) => ({ ...f, start_date: e.target.value }))} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">End</span>
              <input type="date" required value={reqForm.end_date} onChange={(e) => setReqForm((f) => ({ ...f, end_date: e.target.value }))} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Reason</span>
            <textarea value={reqForm.reason} onChange={(e) => setReqForm((f) => ({ ...f, reason: e.target.value }))} rows={2} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createRequest.isPending}>Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
