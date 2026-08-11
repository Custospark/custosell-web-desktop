import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Banknote, LogOut, Wallet, Info } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { formatCurrency, getBusinessCurrency } from '../../shared/utils/formatCurrency';
import { formatTendered, parseTendered } from '../../shared/utils/moneyInput';

interface EndShiftModalProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
  totals: {
    netShiftTotal: number;
    cashTotal: number;
    mobileTotal: number;
    cardTotal: number;
    shiftExpenseTotal: number;
    handoverAmount: number;
    expectedCash: number;
    openingBalance: number;
    transactionCount: number;
  };
  isEnding: boolean;
  onEndShift: (countedCash: number | null) => Promise<boolean>;
  onOpenOpeningBalance?: () => void;
}

export default function EndShiftModal({
  open,
  onClose,
  shiftId,
  totals,
  isEnding,
  onEndShift,
  onOpenOpeningBalance,
}: EndShiftModalProps) {
  const [countedText, setCountedText] = useState<string | null>(null);
  const countedRef = useRef<number | null>(null);
  const hasOpeningBalance = totals.openingBalance > 0;
  const countedNumber = useMemo(() => {
    if (countedText === null) return null;
    return parseTendered(countedText);
  }, [countedText]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setCountedText(null);
      countedRef.current = null;
    });
  }, [open, totals.expectedCash]);

  const variance = useMemo(() => {
    if (countedNumber === null) return null;
    return countedNumber - totals.expectedCash;
  }, [countedNumber, totals.expectedCash]);

  const varianceLabel = useMemo(() => {
    if (variance === null) return null;
    if (Math.abs(variance) < 0.005) return 'Balanced';
    return variance > 0 ? 'Over by' : 'Short by';
  }, [variance]);

  const handleConfirm = async () => {
    const counted = countedRef.current;
    const confirmed = await onEndShift(counted);
    if (confirmed) onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="End Shift — Drawer Reconciliation"
      subtitle="Count the drawer before closing. You can still end the shift if it doesn't match."
      size="md"
    >
      <div className="space-y-5">
        {!hasOpeningBalance && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No opening balance recorded for this shift.</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Without it, expected cash and variance exclude the starting float.
              </p>
              {onOpenOpeningBalance && (
                <Button size="sm" variant="outline" className="mt-2" onClick={onOpenOpeningBalance}>
                  <Banknote className="w-3.5 h-3.5 mr-1.5" />Record opening balance
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />Expected cash in drawer
            </span>
            <span className="text-base font-bold tabular-nums text-blue-900">
              {formatCurrency(totals.expectedCash)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Opening {formatCurrency(totals.openingBalance)} + cash collected {formatCurrency(totals.cashTotal)}
            {totals.shiftExpenseTotal > 0
              ? ` − expenses ${formatCurrency(totals.shiftExpenseTotal)}`
              : ''}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cash counted in drawer</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{getBusinessCurrency()}</span>
            <input
              type="text"
              inputMode="decimal"
              value={countedText ?? (totals.expectedCash > 0 ? formatTendered(String(totals.expectedCash)) : '')}
              onChange={(e) => {
                const formatted = formatTendered(e.target.value);
                setCountedText(formatted);
                countedRef.current = parseTendered(formatted);
              }}
              onFocus={(e) => {
                const base = totals.expectedCash > 0 ? formatTendered(String(totals.expectedCash)) : '';
                setCountedText(base);
                countedRef.current = totals.expectedCash > 0 ? totals.expectedCash : null;
                e.target.select();
              }}
              onBlur={() => setCountedText(null)}
              placeholder="0"
              className="w-full pl-14 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Count the physical cash in the drawer and enter it here.
          </p>
        </div>

        <div
          className={`rounded-lg border px-3 py-2.5 text-sm flex items-center justify-between ${
            variance === null
              ? 'border-gray-200 bg-gray-50 text-gray-600'
              : Math.abs(variance) < 0.005
                ? 'border-green-200 bg-green-50 text-green-700'
                : variance > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="font-medium">
            {varianceLabel ?? 'Enter counted cash to see variance'}
          </span>
          <span className="font-bold tabular-nums">
            {variance !== null ? formatCurrency(Math.abs(variance)) : '—'}
          </span>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
          <p className="text-xs text-gray-600 leading-relaxed">
            {variance === null ? (
              <>
                Enter the cash you counted and we&apos;ll compare it to the expected{' '}
                {formatCurrency(totals.expectedCash)}.
              </>
            ) : Math.abs(variance) < 0.005 ? (
              <>The drawer matches the expected amount. Nice work.</>
            ) : variance > 0 ? (
              <>
                The drawer has <span className="font-semibold text-amber-700">more</span> cash than expected.
                Double-check for unrecorded sales before closing.
              </>
            ) : (
              <>
                The drawer is <span className="font-semibold text-red-700">short</span> of the expected amount.
                Check for expenses or errors before closing.
              </>
            )}{' '}
            A mismatch won&apos;t block closing — the variance is recorded on your report.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirm()}
            loading={isEnding}
            disabled={!shiftId}
          >
            <LogOut className="w-4 h-4 mr-1.5" />End Shift
          </Button>
        </div>
      </div>
    </Modal>
  );
}
