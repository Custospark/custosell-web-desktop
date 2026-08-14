import { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  useApproveHrLeaveRequest,
  useCancelHrLeaveRequest,
  useDeleteHrLeaveType,
  useHrEmployees,
  useHrLeaveBalances,
  useHrLeaveRequests,
  useHrLeaveTypes,
  useRejectHrLeaveRequest,
} from '../api/useHrQueries';
import { employeeDisplayName, type HrLeaveRequest, type HrLeaveType } from '../api/hrTypes';
import { LeaveStatusBadge } from '../ui/HrStatusBadges';
import { HrLeaveRequestMobileCard } from '../ui/HrLeaveRequestMobileCard';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';
import { HrLeaveRequestModal, HrLeaveTypeModal } from '../ui/HrLeaveModals';

export default function HrLeavePage() {
  const { confirm } = useConfirm();
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);
  const year = new Date().getFullYear();
  const { data: leaveTypes = [], isLoading: loadingTypes } = useHrLeaveTypes();
  const { data: balances = [], isLoading: loadingBalances } = useHrLeaveBalances({ year });
  const { data: requests = [], isLoading: loadingRequests } = useHrLeaveRequests();
  const { data: employees = [] } = useHrEmployees();
  const deleteType = useDeleteHrLeaveType();
  const approve = useApproveHrLeaveRequest();
  const reject = useRejectHrLeaveRequest();
  const cancelRequest = useCancelHrLeaveRequest();

  const selfEmployee = employees.find((e) => e.user_id != null && user?.id != null && e.user_id === user.id) ?? null;

  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<HrLeaveType | null>(null);
  const [reqOpen, setReqOpen] = useState(false);

  function openCreateType() {
    setEditingType(null);
    setTypeOpen(true);
  }

  function openEditType(t: HrLeaveType) {
    setEditingType(t);
    setTypeOpen(true);
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

  function requestActions(r: HrLeaveRequest) {
    const label = r.employee
      ? `${employeeDisplayName(r.employee)} · ${formatShiftDateRange(r.start_date, r.end_date)}`
      : formatShiftDateRange(r.start_date, r.end_date);
    return (
      <>
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
      </>
    );
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={CalendarDays}
        title="Leave"
        description={
          isFullHr
            ? 'Set up leave types, track balances, and approve time off - so your team knows where they stand.'
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
              onClick={() => setReqOpen(true)}
              className="inline-flex items-center gap-1.5"
              disabled={!isFullHr && !selfEmployee}
            >
              <Plus className="h-3.5 w-3.5" /> Request leave
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard title="Leave types" description="Annual, sick, unpaid - whatever your policy allows.">
          {loadingTypes ? (
            <div className="flex justify-center py-8"><CustosellLoader /></div>
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
            <div className="flex justify-center py-8"><CustosellLoader /></div>
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
        description={isFullHr ? 'Pending requests need your approval - approved days sync to attendance.' : 'Your leave requests and their status.'}
      >
        {loadingRequests ? (
          <div className="flex justify-center py-8"><CustosellLoader /></div>
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
          <>
            <div className="space-y-3 md:hidden">
              {visibleRequests.map((r) => (
                <HrLeaveRequestMobileCard key={r.id} request={r} actions={requestActions(r)} />
              ))}
            </div>

            <div className={cn(HR_SURFACE.tableWrap, 'hidden md:block')}>
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
                {visibleRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.employee ? employeeDisplayName(r.employee) : `#${r.employee_id}`}</td>
                    <td className="px-3 py-2">{r.leave_type?.name ?? r.leave_type_id}</td>
                    <td className="px-3 py-2 text-gray-600">{formatShiftDateRange(r.start_date, r.end_date)}</td>
                    <td className="px-3 py-2">{r.days}</td>
                    <td className="px-3 py-2"><LeaveStatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        {requestActions(r)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </HrSectionCard>

      <HrLeaveTypeModal
        open={typeOpen && isFullHr}
        onClose={() => {
          setTypeOpen(false);
          setEditingType(null);
        }}
        editing={editingType}
      />
      <HrLeaveRequestModal
        open={reqOpen}
        onClose={() => setReqOpen(false)}
        isFullHr={isFullHr}
        selfEmployee={selfEmployee}
        employees={employees}
      />
    </div>
  );
}
