import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, CircleAlert, Play, SkipForward } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { cn } from '../../../shared/utils/cn';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';
import {
  useAccountingPeriods,
  useFixedAssetSchedule,
  useRunDepreciation,
} from '../api/AccountingQueries';
import type { DepreciationEntry, DepreciationRunResult, FixedAsset } from '../api/AccountingTypes';

function FormModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

function resultTone(status: string) {
  if (status === 'depreciated' || status === 'posted' || status === 'success') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-100';
  }
  if (status === 'failed') return 'bg-red-50 text-red-800 border-red-100';
  return 'bg-slate-50 text-slate-700 border-slate-100';
}

function ResultIcon({ status }: { status: string }) {
  if (status === 'depreciated' || status === 'posted' || status === 'success') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === 'failed') return <CircleAlert className="h-4 w-4 text-red-600" />;
  return <SkipForward className="h-4 w-4 text-slate-500" />;
}

export function RunDepreciationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: periods = [], isLoading } = useAccountingPeriods();
  const runDepreciation = useRunDepreciation();
  const [periodId, setPeriodId] = useState('');
  const [results, setResults] = useState<DepreciationRunResult[] | null>(null);

  const openPeriods = useMemo(
    () => periods.filter((p) => !p.is_closed),
    [periods],
  );

  const selectedPeriod = useMemo(
    () => periods.find((p) => String(p.id) === periodId),
    [periods, periodId],
  );

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setResults(null);
      const preferred = openPeriods[0] ?? periods[0];
      setPeriodId(preferred ? String(preferred.id) : '');
    });
  }, [open, openPeriods, periods]);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId) return;
    const data = await runDepreciation.mutateAsync({ period_id: Number(periodId) });
    setResults(data);
  }

  const depreciatedCount = results?.filter((r) => r.status === 'depreciated' || r.status === 'posted' || r.status === 'success').length ?? 0;
  const skippedCount = results?.filter((r) => r.status === 'skipped').length ?? 0;
  const failedCount = results?.filter((r) => r.status === 'failed').length ?? 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Run depreciation"
      subtitle="Post this period’s wear-and-tear expense to the books."
      size="lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (
        <form onSubmit={(e) => void handleRun(e)} className="space-y-4">
          <PipelineModalHero
            icon={Play}
            title="Straight-line depreciation"
            description="For each active asset still above salvage value, posts one month of expense and lowers book value. Already-run assets in this period are skipped."
            tone="indigo"
          />

          <PipelineFormSection
            title="What this does"
            icon={CalendarRange}
            description="Accounting effect for the selected open period."
          >
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span><span className="font-medium text-gray-800">Debit</span> Depreciation Expense (6300) — expense hits the income statement.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span><span className="font-medium text-gray-800">Credit</span> Accumulated Depreciation (1205) — reduces net book value on the balance sheet.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>Amount per asset = (cost − salvage) ÷ useful life in months, capped so book value never falls below salvage.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>Does not move cash, change who holds the asset in HR, or create an expense record under Expenses.</span>
              </li>
            </ul>
          </PipelineFormSection>

          <PipelineFormSection title="Period" icon={CalendarRange}>
            <PipelineIconField
              label="Accounting period"
              icon={CalendarRange}
              required
              hint={selectedPeriod?.is_closed ? 'Closed periods cannot receive new depreciation posts.' : 'Prefer an open period that covers the month you are closing.'}
            >
              <select
                required
                value={periodId}
                onChange={(e) => {
                  setPeriodId(e.target.value);
                  setResults(null);
                }}
                className={pipelineSelectClass}
              >
                <option value="">Select period…</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.is_closed}>
                    {p.name}{p.is_closed ? ' (closed)' : ' (open)'}
                  </option>
                ))}
              </select>
            </PipelineIconField>
          </PipelineFormSection>

          {results ? (
            <PipelineFormSection
              title="Run results"
              icon={CheckCircle2}
              description={`${depreciatedCount} posted · ${skippedCount} skipped · ${failedCount} failed`}
            >
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {results.map((r) => (
                  <div
                    key={`${r.asset_id}-${r.status}-${r.amount ?? 0}`}
                    className={cn('flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm', resultTone(r.status))}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <ResultIcon status={r.status} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.asset_name}</p>
                        <p className="text-xs capitalize opacity-80">
                          {r.status}
                          {r.error ? ` — ${r.error}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">
                      {r.amount != null ? r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </PipelineFormSection>
          ) : null}

          <FormModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {results ? 'Done' : 'Cancel'}
            </Button>
            <Button type="submit" loading={runDepreciation.isPending} disabled={!periodId || Boolean(selectedPeriod?.is_closed)}>
              {results ? 'Run again' : 'Run depreciation'}
            </Button>
          </FormModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function FixedAssetSchedulePanel({
  asset,
  onClose,
}: {
  asset: FixedAsset | null;
  onClose: () => void;
}) {
  const { data: schedule = [], isLoading } = useFixedAssetSchedule(asset?.id ?? 0, Boolean(asset));

  return (
    <Modal
      isOpen={Boolean(asset)}
      onClose={onClose}
      title="Depreciation schedule"
      subtitle={asset ? `${asset.name}${asset.asset_tag ? ` · ${asset.asset_tag}` : ''}` : undefined}
      size="lg"
    >
      <div className="space-y-4">
        <PipelineModalHero
          icon={CalendarRange}
          title="Posted depreciation history"
          description="Each row is one period’s journal posting and the book value after that run."
          tone="slate"
        />
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !asset || schedule.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No depreciation entries yet. Use Run depreciation for an open period.
          </p>
        ) : (
          <ScheduleTable rows={schedule} />
        )}
        <FormModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </FormModalFooter>
      </div>
    </Modal>
  );
}

function ScheduleTable({ rows }: { rows: DepreciationEntry[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5">Period</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5 text-right">Accumulated</th>
            <th className="px-4 py-2.5 text-right">Book after</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-indigo-50/30">
              <td className="px-4 py-2.5 text-gray-700">{row.period_id}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{row.accumulated_depreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">{row.book_value_after.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
