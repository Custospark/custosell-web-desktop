import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useHrNssfReport, useHrPayeReport, useHrPayRuns } from '../api/useHrQueries';
import type { HrNssfReportRow, HrPayeReportRow } from '../api/hrTypes';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function formatMoney(n: number | undefined | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default function HrReportsPage() {
  const { data: payRuns = [] } = useHrPayRuns();
  const [payRunId, setPayRunId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const filters = useMemo(
    () => ({
      pay_run_id: payRunId ? Number(payRunId) : undefined,
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined,
    }),
    [payRunId, periodStart, periodEnd],
  );

  const hasFilter = Boolean(filters.pay_run_id || (filters.period_start && filters.period_end));
  const { data: paye, isLoading: loadingPaye, isFetching: fetchingPaye } = useHrPayeReport(filters, hasFilter);
  const { data: nssf, isLoading: loadingNssf, isFetching: fetchingNssf } = useHrNssfReport(filters, hasFilter);

  const payeRows = (paye?.rows ?? []) as HrPayeReportRow[];
  const nssfRows = (nssf?.rows ?? []) as HrNssfReportRow[];

  return (
    <div className="space-y-4">
      <HrPageHeader
        title="Statutory reports"
        description="PAYE and NSSF schedules for a pay run or date range (Uganda)."
      />

      <HrSectionCard title="Filters">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Pay run</span>
            <select value={payRunId} onChange={(e) => setPayRunId(e.target.value)} className={inputClass}>
              <option value="">Any / use dates</option>
              {payRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.period_start} → {run.period_end} ({run.status})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Period start</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Period end</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
          </label>
        </div>
        {!hasFilter ? (
          <p className="mt-3 text-sm text-amber-700">Select a pay run or both period dates to load reports.</p>
        ) : null}
      </HrSectionCard>

      {!hasFilter ? (
        <HrEmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Choose a period"
          description="Reports pull from calculated or posted pay runs. Post a run first for final schedules."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HrSectionCard title="PAYE schedule">
            {loadingPaye || fetchingPaye ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : payeRows.length === 0 ? (
              <p className="text-sm text-gray-500">No PAYE rows for this filter.</p>
            ) : (
              <div className={HR_SURFACE.tableWrap}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">PAYE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payeRows.map((row, idx) => (
                      <tr key={`${row.employee_id}-${idx}`}>
                        <td className="px-3 py-2">
                          {row.employee_name ?? `#${row.employee_id}`}
                          {row.employee_number ? (
                            <span className="ml-1 font-mono text-xs text-gray-400">{row.employee_number}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{formatMoney(row.gross)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatMoney(row.paye)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HrSectionCard>

          <HrSectionCard title="NSSF schedule">
            {loadingNssf || fetchingNssf ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : nssfRows.length === 0 ? (
              <p className="text-sm text-gray-500">No NSSF rows for this filter.</p>
            ) : (
              <div className={HR_SURFACE.tableWrap}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Employee contrib.</th>
                      <th className="px-3 py-2">Employer contrib.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {nssfRows.map((row, idx) => (
                      <tr key={`${row.employee_id}-${idx}`}>
                        <td className="px-3 py-2">{row.employee_name ?? `#${row.employee_id}`}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatMoney(row.nssf_employee)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatMoney(row.nssf_employer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HrSectionCard>
        </div>
      )}
    </div>
  );
}
