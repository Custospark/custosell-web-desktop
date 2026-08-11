import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Compass, Shield, Users, Wallet } from 'lucide-react';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useHrAuditLogs } from '../api/useHrQueries';
import { HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';

const AUDIT_PAGE_SIZE = 10;

export default function HrSettingsPage() {
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditLogPage, isLoading } = useHrAuditLogs({}, auditPage, AUDIT_PAGE_SIZE);
  const logs = auditLogPage?.items ?? [];
  const totalLogs = auditLogPage?.total ?? 0;
  const lastPage = auditLogPage?.lastPage ?? 1;
  const currentPage = auditLogPage?.currentPage ?? 1;

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Shield}
        title="HR settings"
        description="Guidance, setup order, and audit activity. Use the main app sidebar to jump between People, Payroll, Leave, and the rest — no separate HR menu here."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard title="How HR & Payroll fits together">
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                <Link to={ROUTES.HR.PEOPLE} className="font-medium text-indigo-700 hover:underline">People</Link>
                {' '}are HR profiles. Optionally link them to Settings → Staff for login access — one person, one account.
              </span>
            </li>
            <li className="flex gap-3">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                Departments and positions organize your org chart before you assign employees — find them in the main sidebar under HR & Payroll.
              </span>
            </li>
            <li className="flex gap-3">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                Payroll is Uganda-first (PAYE, NSSF). Assign compensation, then calculate → approve → post a pay run.
              </span>
            </li>
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                Module access is controlled like Documents and Accounting. Staff without the{' '}
                <code className="rounded bg-gray-100 px-1 text-xs">hr</code> module cannot open these pages.
              </span>
            </li>
          </ul>
        </HrSectionCard>

        <HrSectionCard title="Recommended setup order">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
            <li>Create departments and positions.</li>
            <li>Add employees and set status to Active when ready.</li>
            <li>Link staff users for people who need app login.</li>
            <li>Configure leave types, then accept leave requests.</li>
            <li>Create a salary structure and assign compensations.</li>
            <li>Run payroll, review PAYE/NSSF reports, then post.</li>
          </ol>
        </HrSectionCard>
      </div>

      <HrSectionCard
        title="Recent audit log"
        description="Sensitive HR actions recorded by the API — helpful when you need to trace who changed what."
      >
        {isLoading ? (
          <div className="flex justify-center py-10"><CustosellLoader /></div>
        ) : totalLogs === 0 ? (
          <p className="text-sm text-gray-500">
            No audit entries yet. Creating employees and posting pay runs will show up here as your team uses HR.
          </p>
        ) : (
          <>
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-[40rem] text-sm">
                <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {log.created_at ? formatShiftDateTime(log.created_at) : '—'}
                      </td>
                      <td className="px-3 py-2">{log.actor?.name ?? (log.actor_user_id ? `#${log.actor_user_id}` : '—')}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{log.action}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {log.subject_type}
                        {log.subject_id != null ? ` #${log.subject_id}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-gray-500">
              <span>
                Showing {totalLogs === 0 ? 0 : (currentPage - 1) * AUDIT_PAGE_SIZE + 1}–
                {Math.min(currentPage * AUDIT_PAGE_SIZE, totalLogs)} of {totalLogs}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 text-xs">
                  Page {currentPage} of {Math.max(1, lastPage)}
                </span>
                <button
                  type="button"
                  onClick={() => setAuditPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </HrSectionCard>
    </div>
  );
}
