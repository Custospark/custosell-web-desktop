import { useEffect, useMemo, useState } from 'react';
import { Banknote, Info, Scale, Printer, Wallet, X } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { useUpdateShiftBalance } from './ShiftMutations';
import { cashAtHandover, cashCollected } from '../../shared/utils/accounting';
import { computeShiftCollections } from '../../shared/utils/shiftCollectionTotals';
import { formatTendered, parseTendered } from '../../shared/utils/moneyInput';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { toAmount } from '../sales/utils/saleAmounts';
import type { ShiftWithSyncMeta } from '../../app/store/offline/sales/localShiftsStore';
import type { Payment } from '../payments/paymentTypes';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';

interface BalanceShiftModalProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
  shift: ShiftWithSyncMeta | null | undefined;
  shiftSales?: SaleWithSyncMeta[];
  shiftPayments?: Payment[];
  shiftExpenses?: ExpenseWithSyncMeta[];
  onViewReport?: () => void;
}

export default function BalanceShiftModal({
  open,
  onClose,
  shiftId,
  shift,
  shiftSales = [],
  shiftPayments = [],
  shiftExpenses = [],
  onViewReport,
}: BalanceShiftModalProps) {
  const { business } = useBusinessTaxSettings();
  const updateMutation = useUpdateShiftBalance();

  const opening = Number(shift?.opening_balance ?? 0);
  const counted = shift?.counted_cash != null ? Number(shift.counted_cash) : null;
  const hasCounted = counted !== null;

  const [openingText, setOpeningText] = useState<string | null>(null);
  const [countedText, setCountedText] = useState<string | null>(null);
  const [openingDraft, setOpeningDraft] = useState<number | null>(null);
  const [countedDraft, setCountedDraft] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setOpeningText(null);
      setCountedText(null);
      setOpeningDraft(null);
      setCountedDraft(null);
      setSaved(false);
    });
  }, [open, shift]);

  const resolvedOpening = openingDraft !== null ? openingDraft : opening;
  const resolvedCounted = countedDraft !== null ? countedDraft : (hasCounted ? counted : null);

  const collections = computeShiftCollections(shiftPayments, shiftSales);
  const shiftExpenseTotal = shiftExpenses.reduce((sum, e) => sum + toAmount(e.amount), 0);
  const cashCollectedTotal = cashCollected(collections.cash, shiftExpenseTotal);
  const expectedCash = cashAtHandover(resolvedOpening, collections.cash, shiftExpenseTotal);

  const variance = resolvedCounted === null ? null : resolvedCounted - expectedCash;

  const varianceLabel = useMemo(() => {
    if (variance === null) return null;
    if (Math.abs(variance) < 0.005) return 'Balanced';
    return variance > 0 ? 'Over by' : 'Short by';
  }, [variance]);

  const handleSave = async () => {
    if (!shiftId) return;
    const payload: { id: number; openingBalance?: number | null; countedCash?: number | null } = { id: shiftId };
    if (resolvedOpening !== opening) payload.openingBalance = resolvedOpening;
    if (resolvedCounted !== counted) payload.countedCash = resolvedCounted;
    if (Object.keys(payload).length === 1) {
      // Nothing changed - just mark saved and let them view the report.
      setSaved(true);
      return;
    }
    try {
      await updateMutation.mutateAsync(payload);
      setSaved(true);
    } catch {
      // Toast surfaced by the mutation.
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Balance Shift"
      subtitle="Record the cash you started with and count the drawer at close."
      size="md"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Reconcile your drawer</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Set your starting cash and count what&apos;s in the drawer. We compare counted cash to expected cash
              so you know exactly where the shift stands - no surprises at handover.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cash at shift start</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{business?.currency || 'UGX'}</span>
              <input
                type="text"
                inputMode="decimal"
                value={openingText ?? (opening > 0 ? formatTendered(String(opening)) : '')}
                onChange={(e) => {
                  const formatted = formatTendered(e.target.value);
                  setOpeningText(formatted);
                  setOpeningDraft(parseTendered(formatted));
                }}
                onFocus={(e) => {
                  const base = opening > 0 ? formatTendered(String(opening)) : '';
                  setOpeningText(base);
                  setOpeningDraft(opening);
                  e.target.select();
                }}
                onBlur={() => setOpeningText(null)}
                placeholder="0"
                autoFocus
                className="w-full pl-14 pr-9 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
              {(opening > 0 || (openingDraft ?? 0) > 0) && (
                <button
                  type="button"
                  title="Clear starting cash"
                  onClick={() => {
                    setOpeningText('');
                    setOpeningDraft(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">The cash you put in the drawer when the shift started.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cash counted at end of shift</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{business?.currency || 'UGX'}</span>
              <input
                type="text"
                inputMode="decimal"
                value={countedText ?? (hasCounted ? formatTendered(String(counted)) : '')}
                onChange={(e) => {
                  const formatted = formatTendered(e.target.value);
                  setCountedText(formatted);
                  setCountedDraft(parseTendered(formatted));
                }}
                onFocus={(e) => {
                  const base = hasCounted ? formatTendered(String(counted)) : '';
                  setCountedText(base);
                  setCountedDraft(counted);
                  e.target.select();
                }}
                onBlur={() => setCountedText(null)}
                placeholder="0"
                className="w-full pl-14 pr-9 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
              {(counted !== null || (countedDraft ?? 0) > 0) && (
                <button
                  type="button"
                  title="Clear counted cash"
                  onClick={() => {
                    setCountedText('');
                    setCountedDraft(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">Count the physical cash now in the drawer.</p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />Expected cash in drawer
            </span>
            <span className="text-base font-bold tabular-nums text-blue-900">{formatCurrency(expectedCash)}</span>
          </div>
          <p className="text-[11px] text-gray-500">
            Starting cash {formatCurrency(openingDraft)} + cash collected {formatCurrency(cashCollectedTotal)}
            {shiftExpenseTotal > 0 ? ` (after expenses ${formatCurrency(shiftExpenseTotal)})` : ''}
          </p>
          {variance !== null && (
            <div
              className={`mt-2 flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                Math.abs(variance) < 0.005
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : variance > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span className="font-medium">
                {varianceLabel ?? 'Enter counted cash to see variance'}
              </span>
              <span className="font-bold tabular-nums">
                {variance !== null ? formatCurrency(Math.abs(variance)) : '-'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Expected cash = starting cash + cash sales after refunds − drawer expenses. Variance is recorded on the
            shift report whether balanced or not.
          </p>
        </div>

        {saved && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p className="flex items-center gap-1.5 font-medium">
              <Banknote className="w-4 h-4" />
              Balance saved.
            </p>
            {onViewReport && (
              <Button size="sm" onClick={onViewReport} className="self-start">
                <Printer className="w-4 h-4 mr-1.5" />View shift report
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!saved && (
            <Button onClick={() => void handleSave()} loading={updateMutation.isPending}>
              Save balance
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
