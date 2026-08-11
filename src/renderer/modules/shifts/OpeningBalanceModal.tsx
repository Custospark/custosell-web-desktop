import { useEffect, useRef, useState } from 'react';
import { Banknote, Info, X } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { useUpdateShiftOpeningBalance } from './ShiftMutations';
import { formatTendered, parseTendered } from '../../shared/utils/moneyInput';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import type { ShiftWithSyncMeta } from '../../app/store/offline/sales/localShiftsStore';

interface OpeningBalanceModalProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
  shift: ShiftWithSyncMeta | null | undefined;
}

export default function OpeningBalanceModal({ open, onClose, shiftId, shift }: OpeningBalanceModalProps) {
  const { business } = useBusinessTaxSettings();
  const updateMutation = useUpdateShiftOpeningBalance();
  const current = Number(shift?.opening_balance ?? 0);
  const hasCurrent = current > 0;
  const [amountText, setAmountText] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const draftRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setAmountText(null);
      draftRef.current = null;
      setClearing(false);
    });
  }, [open, shift]);

  const handleSave = async () => {
    const amount = draftRef.current !== null ? draftRef.current : current;
    if (!shiftId || amount < 0) return;
    try {
      await updateMutation.mutateAsync({ id: shiftId, openingBalance: amount });
      onClose();
    } catch {
      // Toast surfaced by the mutation.
    }
  };

  const handleClear = async () => {
    if (!shiftId) return;
    setClearing(true);
    try {
      await updateMutation.mutateAsync({ id: shiftId, openingBalance: null });
      onClose();
    } catch {
      setClearing(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Opening Balance"
      subtitle="The cash float you put in the drawer when your shift started."
      size="md"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shrink-0 shadow-sm">
            <Banknote className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">
              {hasCurrent ? 'Update your starting float' : 'Set your starting float'}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Your drawer is expected to hold this amount{' '}
              <span className="font-semibold">plus</span> what you collect in cash,{' '}
              <span className="font-semibold">minus</span> expenses paid from it.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cash in drawer at shift start</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {business?.currency || 'UGX'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amountText ?? (hasCurrent ? formatTendered(String(current)) : '')}
              onChange={(e) => {
                const formatted = formatTendered(e.target.value);
                setAmountText(formatted);
                draftRef.current = parseTendered(formatted);
              }}
              onFocus={(e) => {
                const base = hasCurrent ? formatTendered(String(current)) : '';
                setAmountText(base);
                draftRef.current = current;
                e.target.select();
              }}
              onBlur={() => setAmountText(null)}
              placeholder="0"
              autoFocus
              className="w-full pl-16 pr-10 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
            />
            {hasCurrent && (
              <button
                type="button"
                title="Remove opening balance"
                onClick={() => void handleClear()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            {hasCurrent
              ? `Currently recorded: ${formatCurrency(current)}. Use the × to remove it.`
              : 'Leave empty if you started without a cash float.'}
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
          <div className="text-xs text-gray-600 leading-relaxed">
            <p>
              <span className="font-semibold text-gray-800">Why it matters:</span> at shift close we add your cash
              sales to this float, subtract drawer expenses, and compare it to what you actually count.
            </p>
            {hasCurrent && (
              <p className="mt-1">
                Removing it means the drawer is expected to hold only what you collect this shift.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-200">
          {hasCurrent && (
            <Button variant="ghost" onClick={() => void handleClear()} loading={clearing}>
              Remove Opening Balance
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={updateMutation.isPending && !clearing} disabled={clearing}>
            {hasCurrent ? 'Update Opening Balance' : 'Save Opening Balance'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
