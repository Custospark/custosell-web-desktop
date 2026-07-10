import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle2, Receipt, Send } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useApproveHrPayRun,
  useCalculateHrPayRun,
  useHrPayRun,
  usePostHrPayRun,
} from '../api/useHrQueries';
import { employeeDisplayName } from '../api/hrTypes';
import { PayRunStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default function HrPayRunDetailPage() {
  const { payRunId } = useParams();
  const id = Number(payRunId);
  const { confirm } = useConfirm();
  const { data: payRun, isLoading, isError } = useHrPayRun(id);
  const calculate = useCalculateHrPayRun();
  const approve = useApproveHrPayRun();
  const post = usePostHrPayRun();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !payRun) {
    return (
      <div className="space-y-3">
        <Link to={ROUTES.HR.PAYROLL} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to payroll
        </Link>
        <p className="text-sm text-gray-500">We couldn&apos;t find this pay run — it may have been removed.</p>
      </div>
    );
  }

  const lines = payRun.lines ?? [];
  const canCalculate = payRun.status === 'draft' || payRun.status === 'calculated';
  const canApprove = payRun.status === 'calculated';
  const canPost = payRun.status === 'approved';

  async function handlePost() {
    const ok = await confirm({
      title: 'Post pay run?',
      message: 'Posting locks this run and may create accounting journal entries. This action is idempotent if already posted.',
      confirmText: 'Post',
      variant: 'warning',
    });
    if (ok) await post.mutateAsync(id);
  }

  const description = payRun.posted_journal_entry_id
    ? `Posted to accounting · journal #${payRun.posted_journal_entry_id}`
    : 'Review the lines below, then calculate → approve → post when you\'re confident.';

  return (
    <div className="space-y-5">
      <Link to={ROUTES.HR.PAYROLL} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to payroll
      </Link>

      <HrPageHeader
        icon={Calculator}
        title={`Pay run · ${formatShiftDateRange(payRun.period_start, payRun.period_end)}`}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PayRunStatusBadge status={payRun.status} />
            {canCalculate ? (
              <Button
                size="sm"
                variant="outline"
                loading={calculate.isPending}
                onClick={() => calculate.mutate(id)}
                className="inline-flex items-center gap-1.5"
              >
                <Calculator className="h-3.5 w-3.5" /> Calculate
              </Button>
            ) : null}
            {canApprove ? (
              <Button
                size="sm"
                loading={approve.isPending}
                onClick={() => approve.mutate(id)}
                className="inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            ) : null}
            {canPost ? (
              <Button
                size="sm"
                loading={post.isPending}
                onClick={handlePost}
                className="inline-flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Post
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <HrSectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total gross</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatMoney(payRun.total_gross)}</p>
        </HrSectionCard>
        <HrSectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total net</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatMoney(payRun.total_net)}</p>
        </HrSectionCard>
        <HrSectionCard>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Employee lines</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{payRun.lines_count ?? lines.length}</p>
        </HrSectionCard>
      </div>

      <HrSectionCard title="Pay lines" description="Gross, PAYE, NSSF, and net per employee — calculated from assigned compensation.">
        {lines.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none backdrop-blur-none py-10"
            icon={<Receipt className="h-6 w-6" />}
            title="No pay lines yet"
            description="Assign compensation to active employees, then click Calculate — we'll compute PAYE and NSSF for each person."
            action={
              canCalculate ? (
                <Button
                  variant="outline"
                  loading={calculate.isPending}
                  onClick={() => calculate.mutate(id)}
                  className="inline-flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" /> Calculate now
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">PAYE</th>
                  <th className="px-3 py-2">NSSF (emp)</th>
                  <th className="px-3 py-2">NSSF (er)</th>
                  <th className="px-3 py-2">Other</th>
                  <th className="px-3 py-2">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2 font-medium">
                      {line.employee ? employeeDisplayName(line.employee) : `#${line.employee_id}`}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.gross)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.paye)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.nssf_employee)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.nssf_employer)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.other_deductions)}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{formatMoney(line.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>
    </div>
  );
}
