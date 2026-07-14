import { useMemo, useState } from 'react';
import { BarChart3, Calendar, FileSpreadsheet, Filter } from 'lucide-react';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useHrNssfReport, useHrPayeReport, useHrPayRuns } from '../api/useHrQueries';
import type { HrNssfReportRow, HrPayeReportRow } from '../api/hrTypes';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HrFormSection, HrIconField, hrInputClass, hrSelectClass } from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { HrPayrollAffordabilityPanel } from '../ui/HrPayrollAffordabilityPanel';
import { formatShiftDateRange } from '../../../shared/utils/formatDateTime';

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
    <div className="space-y-5">
      <HrPageHeader
        icon={BarChart3}
        title="HR reports"
        description="Payroll cash runway plus PAYE and NSSF schedules for URA and NSSF filings."
      />

      <HrPayrollAffordabilityPanel />

      <HrSectionCard title="Statutory report filters" description="Pick a pay run or enter a date range to load schedules.">
        <HrFormSection title="Period" icon={Filter} description="Posted runs give the most accurate final numbers.">
          <div className="grid gap-4 sm:grid-cols-3">
            <HrIconField label="Pay run" icon={FileSpreadsheet}>
              <select value={payRunId} onChange={(e) => setPayRunId(e.target.value)} className={hrSelectClass}>
                <option value="">Any — use dates below</option>
                {payRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {formatShiftDateRange(run.period_start, run.period_end)} ({run.status})
                  </option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Period start" icon={Calendar}>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Period end" icon={Calendar}>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={hrInputClass} />
            </HrIconField>
          </div>
        </HrFormSection>
        {!hasFilter ? (
          <p className="mt-3 text-sm text-amber-700">
            Select a pay run or both period dates — we&apos;ll load PAYE and NSSF schedules when you do.
          </p>
        ) : null}
      </HrSectionCard>

      {!hasFilter ? (
        <HrEmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Choose a period for statutory schedules"
          description="PAYE and NSSF pull from calculated or posted pay runs. Cash runway above loads without a pay-run filter."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HrSectionCard title="PAYE schedule" description="Income tax withheld per employee for URA.">
            {loadingPaye || fetchingPaye ? (
              <div className="flex justify-center py-10"><CustosellLoader /></div>
            ) : payeRows.length === 0 ? (
              <p className="text-sm text-gray-500">No PAYE rows for this filter — try a calculated or posted pay run.</p>
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

          <HrSectionCard title="NSSF schedule" description="Employee and employer contributions per person.">
            {loadingNssf || fetchingNssf ? (
              <div className="flex justify-center py-10"><CustosellLoader /></div>
            ) : nssfRows.length === 0 ? (
              <p className="text-sm text-gray-500">No NSSF rows for this filter — try a calculated or posted pay run.</p>
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
