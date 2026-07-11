import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Input } from '../../../shared/components/inputs/Input';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useAccountingPeriods,
  useChartOfAccounts,
  useFixedAssetSchedule,
  useRunDepreciation,
} from '../api/AccountingQueries';
import type { DepreciationEntry, DepreciationRunResult, FixedAsset } from '../api/AccountingTypes';

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

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setResults(null);
      const preferred = openPeriods[0] ?? periods[0];
      setPeriodId(preferred ? String(preferred.id) : '');
    });
  }, [open, openPeriods, periods]);

  if (!open) return null;

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!periodId) return;
    const data = await runDepreciation.mutateAsync({ period_id: Number(periodId) });
    setResults(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Run depreciation</h2>
        <p className="text-sm text-gray-500">Posts straight-line depreciation for active assets in the selected period.</p>
        {isLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : (
          <form onSubmit={(e) => void handleRun(e)} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Accounting period
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select period…</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_closed ? ' (closed)' : ' (open)'}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="submit" loading={runDepreciation.isPending} disabled={!periodId}>Run</Button>
            </div>
          </form>
        )}
        {results ? (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 text-sm">
            {results.map((r) => (
              <div key={`${r.asset_id}-${r.status}`} className="flex justify-between border-b border-gray-50 px-3 py-2 last:border-0">
                <span>{r.asset_name}</span>
                <span className="text-gray-600">
                  {r.status}{r.amount != null ? ` · ${r.amount.toLocaleString()}` : ''}{r.error ? ` — ${r.error}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
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

  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Depreciation schedule</h2>
            <p className="text-sm text-gray-500">{asset.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : schedule.length === 0 ? (
          <p className="text-sm text-gray-500">No depreciation entries yet. Run depreciation for an open period.</p>
        ) : (
          <ScheduleTable rows={schedule} />
        )}
      </div>
    </div>
  );
}

function ScheduleTable({ rows }: { rows: DepreciationEntry[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-gray-100">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Period</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-right">Accumulated</th>
            <th className="px-3 py-2 text-right">Book after</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-50">
              <td className="px-3 py-2">{row.period_id}</td>
              <td className="px-3 py-2 text-right">{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-right">{row.accumulated_depreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-right">{row.book_value_after.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AddFixedAssetForm({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<FixedAsset>) => void;
  loading: boolean;
}) {
  const { data: accounts = [] } = useChartOfAccounts();
  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.is_active && String(a.code).startsWith('12')),
    [accounts],
  );

  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [salvageValue, setSalvageValue] = useState('');
  const [usefulLife, setUsefulLife] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('other');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedAccount = accountId
      ? Number(accountId)
      : assetAccounts[0]?.id;
    if (!resolvedAccount) return;
    onSubmit({
      name,
      cost: Number(cost),
      salvage_value: Number(salvageValue),
      useful_life_months: Number(usefulLife),
      purchase_date: purchaseDate,
      account_id: resolvedAccount,
      category: category as FixedAsset['category'],
      status: 'active',
      book_value: Number(cost),
      notes: null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Add Fixed Asset</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Asset Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} required />
          <Input label="Salvage Value" type="number" step="0.01" min="0" value={salvageValue} onChange={(e) => setSalvageValue(e.target.value)} required />
          <Input label="Useful Life (months)" type="number" min="1" value={usefulLife} onChange={(e) => setUsefulLife(e.target.value)} required />
          <Input label="Purchase Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          <label className="block text-sm font-medium text-gray-700">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="laptop">Laptop</option>
              <option value="phone">Phone</option>
              <option value="furniture">Furniture</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            GL account (12xx)
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required={!assetAccounts[0]}
            >
              <option value="">{assetAccounts[0] ? `Default: ${assetAccounts[0].code} ${assetAccounts[0].name}` : 'Select account…'}</option>
              {assetAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={!assetAccounts.length && !accountId}>Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
