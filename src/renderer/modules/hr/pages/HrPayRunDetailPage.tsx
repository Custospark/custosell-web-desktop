import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Receipt,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  useApproveHrPayRun,
  useCalculateHrPayRun,
  useDeleteHrPayRun,
  useHrPayRun,
  usePostHrPayRun,
  useRemitHrStatutory,
  useSettleHrPayRun,
  useUpdateHrPayRun,
  useVoidHrPayRun,
} from '../api/useHrQueries';
import { employeeDisplayName } from '../api/hrTypes';
import { PayRunStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
} from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '-';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function toDateInput(value: string | undefined | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function JournalLink({ entryId, label }: { entryId: number; label: string }) {
  return (
    <Link
      to={`${ROUTES.ACCOUNTING.JOURNAL_ENTRIES}?entry_id=${entryId}`}
      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
    >
      {label} #{entryId}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function HrPayRunDetailPage() {
  const { payRunId } = useParams();
  const id = Number(payRunId);
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { data: payRun, isLoading, isError } = useHrPayRun(id);
  const calculate = useCalculateHrPayRun();
  const approve = useApproveHrPayRun();
  const post = usePostHrPayRun();
  const settle = useSettleHrPayRun();
  const remit = useRemitHrStatutory();
  const voidRun = useVoidHrPayRun();
  const deleteRun = useDeleteHrPayRun();
  const updateRun = useUpdateHrPayRun();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ period_start: '', period_end: '' });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <CustosellLoader />
      </div>
    );
  }

  if (isError || !payRun) {
    return (
      <div className="space-y-3">
        <Link to={ROUTES.HR.PAYROLL} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to payroll
        </Link>
        <p className="text-sm text-gray-500">We couldn&apos;t find this pay run - it may have been removed.</p>
      </div>
    );
  }

  const lines = payRun.lines ?? [];
  const canCalculate = payRun.status === 'draft' || payRun.status === 'calculated';
  const canApprove = payRun.status === 'calculated';
  const canPost = payRun.status === 'approved'
    || (payRun.status === 'posted' && !payRun.posted_journal_entry_id);
  const canSettle = payRun.status === 'posted'
    && !!payRun.posted_journal_entry_id
    && !payRun.net_settled_at
    && !payRun.voided_at;
  const canRemit = payRun.status === 'posted'
    && !!payRun.posted_journal_entry_id
    && !payRun.statutory_remitted_at
    && !payRun.voided_at;
  const canVoid = (payRun.status === 'posted' || payRun.status === 'approved') && !payRun.voided_at;
  const canDelete = payRun.status === 'draft' || payRun.status === 'calculated';
  const canEditPeriod = payRun.status === 'draft';
  const postFailed = payRun.status === 'approved' && !!payRun.posting_note && !payRun.posted_journal_entry_id;
  const isRetryPost = payRun.status === 'posted' && !payRun.posted_journal_entry_id;

  function openPeriodEdit() {
    if (!payRun) return;
    setPeriodForm({
      period_start: toDateInput(payRun.period_start),
      period_end: toDateInput(payRun.period_end),
    });
    setPeriodOpen(true);
  }

  async function handlePeriodSave(e: React.FormEvent) {
    e.preventDefault();
    await updateRun.mutateAsync({ id, ...periodForm });
    setPeriodOpen(false);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete pay run?',
      message: 'Remove this draft/calculated pay run? Lines and payslips for this run will be deleted.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      await deleteRun.mutateAsync(id);
      navigate(ROUTES.HR.PAYROLL);
    }
  }

  async function handlePost() {
    const ok = await confirm({
      title: isRetryPost ? 'Retry accounting post?' : 'Post pay run?',
      message: isRetryPost
        ? 'This run was marked posted without a journal. Retry will create the accrual journal (Dr Salaries / Cr PAYE·NSSF·Salaries payable). Requires an open accounting period.'
        : 'Posting locks this run and creates an accounting journal (Dr 6101 / Cr 2110-2112). Requires payroll COA accounts and an open period covering the period end date.',
      confirmText: isRetryPost ? 'Retry post' : 'Post',
      variant: 'warning',
    });
    if (ok) await post.mutateAsync(id);
  }

  async function handleSettle() {
    const ok = await confirm({
      title: 'Mark net pay settled?',
      message: 'Creates a journal: Dr Salaries Payable / Cr Bank. Use this when wages have been paid from the bank.',
      confirmText: 'Mark settled',
      variant: 'warning',
    });
    if (ok) await settle.mutateAsync({ id, funding_account_code: '1102' });
  }

  async function handleRemit() {
    const ok = await confirm({
      title: 'Remit PAYE & NSSF?',
      message: 'Creates a journal: Dr PAYE Payable + NSSF Payable / Cr Bank. Use this when statutory amounts have been remitted.',
      confirmText: 'Remit',
      variant: 'warning',
    });
    if (ok) await remit.mutateAsync({ id, funding_account_code: '1102' });
  }

  async function handleVoid() {
    const ok = await confirm({
      title: 'Void pay run?',
      message: 'Reverses linked accounting journals (settlement, statutory, accrual) and marks this run void. Requires an open accounting period for reversing entries.',
      confirmText: 'Void',
      variant: 'danger',
    });
    if (ok) await voidRun.mutateAsync(id);
  }

  const description = payRun.posted_journal_entry_id
    ? `Posted to accounting · journal #${payRun.posted_journal_entry_id}`
    : postFailed
      ? 'Accounting post failed - fix the period/COA issue, then retry Post.'
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
            {payRun.net_settled_at ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800 ring-1 ring-emerald-600/20">
                Net paid
              </span>
            ) : null}
            {payRun.statutory_remitted_at ? (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800 ring-1 ring-sky-600/20">
                Statutory remitted
              </span>
            ) : null}
            {canEditPeriod ? (
              <Button
                size="sm"
                variant="outline"
                onClick={openPeriodEdit}
                className="inline-flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit period
              </Button>
            ) : null}
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
                onClick={() => void handlePost()}
                className="inline-flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> {isRetryPost || postFailed ? 'Retry post' : 'Post'}
              </Button>
            ) : null}
            {canSettle ? (
              <Button
                size="sm"
                variant="outline"
                loading={settle.isPending}
                onClick={() => void handleSettle()}
                className="inline-flex items-center gap-1.5"
              >
                <Banknote className="h-3.5 w-3.5" /> Mark net paid
              </Button>
            ) : null}
            {canRemit ? (
              <Button
                size="sm"
                variant="outline"
                loading={remit.isPending}
                onClick={() => void handleRemit()}
                className="inline-flex items-center gap-1.5"
              >
                <Receipt className="h-3.5 w-3.5" /> Remit PAYE & NSSF
              </Button>
            ) : null}
            {canVoid ? (
              <Button
                size="sm"
                variant="outline"
                loading={voidRun.isPending}
                onClick={() => void handleVoid()}
                className="inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Undo2 className="h-3.5 w-3.5" /> Void
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="danger"
                loading={deleteRun.isPending}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            ) : null}
          </div>
        }
      />

      {payRun.posting_note ? (
        <div
          className={cn(
            'rounded-xl border p-3 text-sm',
            postFailed || (payRun.posting_note.toLowerCase().includes('not created') || payRun.posting_note.toLowerCase().includes('retry failed'))
              ? 'border-amber-300/70 bg-amber-50/90 text-amber-950'
              : 'border-white/60 bg-white/70 text-slate-700',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accounting note</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{payRun.posting_note}</p>
        </div>
      ) : null}

      {(payRun.posted_journal_entry_id
        || payRun.settlement_journal_entry_id
        || payRun.statutory_journal_entry_id) ? (
        <HrSectionCard title="Accounting journals" description="Links into the Accounting module for this pay run.">
          <ul className="space-y-2 text-sm">
            {payRun.posted_journal_entry_id ? (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">Accrual (post)</span>
                <JournalLink entryId={payRun.posted_journal_entry_id} label="Journal" />
              </li>
            ) : null}
            {payRun.settlement_journal_entry_id ? (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">Net settlement</span>
                <JournalLink entryId={payRun.settlement_journal_entry_id} label="Journal" />
              </li>
            ) : null}
            {payRun.statutory_journal_entry_id ? (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">Statutory remittance</span>
                <JournalLink entryId={payRun.statutory_journal_entry_id} label="Journal" />
              </li>
            ) : null}
          </ul>
        </HrSectionCard>
      ) : null}

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

      <HrSectionCard title="Pay lines" description="Gross, PAYE, NSSF, and net per employee - calculated from assigned compensation.">
        {lines.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent py-10 shadow-none backdrop-blur-none"
            icon={<Receipt className="h-6 w-6" />}
            title="No pay lines yet"
            description="Assign compensation to active employees, then click Calculate - we'll compute PAYE and NSSF for each person."
            action={
              canCalculate ? (
                <Button
                  size="sm"
                  loading={calculate.isPending}
                  onClick={() => calculate.mutate(id)}
                  className="inline-flex items-center gap-1.5"
                >
                  <Calculator className="h-3.5 w-3.5" /> Calculate now
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
                  <th className="px-3 py-2">NSSF (ee)</th>
                  <th className="px-3 py-2">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      {line.employee ? employeeDisplayName(line.employee) : `#${line.employee_id}`}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.gross)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.paye)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{formatMoney(line.nssf_employee)}</td>
                    <td className="px-3 py-2 font-mono text-xs font-medium">{formatMoney(line.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <Modal
        isOpen={periodOpen && canEditPeriod}
        onClose={() => setPeriodOpen(false)}
        title="Edit pay period"
        subtitle="Only draft pay runs can change their period."
      >
        <form onSubmit={handlePeriodSave} className="space-y-5">
          <HrModalHero
            icon={Calendar}
            title="Pay period"
            description="Update the start and end dates before you calculate."
            tone="indigo"
          />
          <HrFormSection title="Period" icon={Calendar}>
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Period start" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={periodForm.period_start}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, period_start: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Period end" icon={Calendar} required>
                <input
                  type="date"
                  required
                  value={periodForm.period_end}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, period_end: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setPeriodOpen(false)}>Cancel</Button>
            <Button type="submit" loading={updateRun.isPending}>Save period</Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
