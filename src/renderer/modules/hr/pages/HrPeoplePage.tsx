import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Pencil, Plus, Search, UserMinus, Users } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useHrEmployees,
  useRemoveHrEmployeeAccount,
} from '../api/useHrQueries';
import type { HrEmployee } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { EmployeeStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader } from '../ui/HrSurface';
import { HrAddEmployeeModal } from '../ui/HrAddEmployeeModal';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { useLocations } from '../../settings/api/settings/LocationQueries';
import { useStaffTransfers } from '../../settings/api/settings/StaffTransferQueries';
import { StaffBranchStatsSection } from '../../settings/ui/StaffBranchStatsSection';

export default function HrPeoplePage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);

  const { data: employees = [], isLoading } = useHrEmployees({
    q: search.trim() || undefined,
    status: statusFilter || undefined,
  });
  const removeAccount = useRemoveHrEmployeeAccount();
  const { data: staff } = useStaff();
  const { data: locations } = useLocations();
  const { data: transfers } = useStaffTransfers();
  const paginated = usePagination(employees, 15);
  const hasFilters = Boolean(search.trim() || statusFilter);

  const handleDetach = useCallback(async (employee: HrEmployee) => {
    if (!employee.user_id) return;
    const ok = await confirm({
      title: 'Detach from organization?',
      message: `Remove ${employeeDisplayName(employee)} from this business? Their login stays - they just lose access here. The HR profile remains.`,
      confirmText: 'Detach',
      variant: 'danger',
    });
    if (ok) await removeAccount.mutateAsync(employee.id);
  }, [confirm, removeAccount]);

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        render: (employee: HrEmployee) => (
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{employeeDisplayName(employee)}</p>
            <p className="truncate text-xs text-slate-500">
              {employee.user?.email || employee.email || 'No email on file'}
            </p>
          </div>
        ),
      },
      {
        key: 'number',
        header: 'Number',
        render: (employee: HrEmployee) => (
          <span className="font-mono text-xs text-slate-600">{employee.employee_number}</span>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        render: (employee: HrEmployee) => (
          <span className="text-slate-600">{employee.department?.name ?? '-'}</span>
        ),
      },
      {
        key: 'login',
        header: 'Login',
        render: (employee: HrEmployee) =>
          employee.user_id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
              <KeyRound className="h-3 w-3" />
              Has login
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              No login
            </span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (employee: HrEmployee) => <EmployeeStatusBadge status={employee.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center' as const,
        render: (employee: HrEmployee) => (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Edit profile"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTES.HR.EMPLOYEE(employee.id));
              }}
            >
              <Pencil className="h-4 w-4 text-slate-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={employee.user_id ? 'Detach from organization' : 'No login to detach'}
              disabled={!employee.user_id || removeAccount.isPending}
              onClick={(e) => {
                e.stopPropagation();
                void handleDetach(employee);
              }}
            >
              <UserMinus className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [handleDetach, navigate, removeAccount.isPending],
  );

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Users}
        title="People"
        description="Edit HR profiles anytime (name, role, status, phone). Email and passwords stay locked after create - use Detach to remove org access without deleting the login."
        actions={
          <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        }
      />

      <StaffBranchStatsSection staff={staff} locations={locations} transfers={transfers} isLoading={isLoading} />

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
          <CustosellLoader />
        </div>
      ) : employees.length === 0 ? (
        <HrEmptyState
          icon={<Users className="h-6 w-6" />}
          title={hasFilters ? 'No one matches that search' : 'Your people list is empty'}
          description={
            hasFilters
              ? 'Try another name, clear the status filter, or check spelling.'
              : 'Staff added in Settings appear here after sync. Or add your first employee now.'
          }
          action={
            !hasFilters ? (
              <Button onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add your first employee
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padding={false} className="overflow-hidden p-4 sm:p-6">
          <Table<HrEmployee>
            rowKey={(employee) => employee.id}
            columns={columns}
            data={paginated.data}
            onRowClick={(employee) => navigate(ROUTES.HR.EMPLOYEE(employee.id))}
          />
          <Pagination
            currentPage={paginated.page}
            totalPages={paginated.totalPages}
            totalItems={paginated.totalItems}
            pageSize={paginated.pageSize}
            onPageChange={paginated.setPage}
            onPageSizeChange={paginated.setPageSize}
          />
        </Card>
      )}

      <HrAddEmployeeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
